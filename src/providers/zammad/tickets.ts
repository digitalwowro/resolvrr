import {
  ProviderError,
  type TicketListBucket,
  type TicketListGroupKey,
  type TicketListQuery,
} from "@/core/providers";
import type { ProviderContext } from "@/core/providers";
import type { TicketDetail } from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import {
  mapArticle,
  mapTicket,
  mapTicketListItem,
} from "./mapping";
import { namedAssetValue, namedReferenceValue, relationId } from "./participants";
import {
  zammadArticleListResponseSchema,
  zammadGenericNamedAssetListResponseSchema,
  zammadFullTicketPayloadSchema,
  zammadTicketListResponseSchema,
  zammadTicketSchema,
  zammadUserSchema,
  type ZammadArticle,
  type ZammadAssets,
  type ZammadGenericNamedAsset,
  type ZammadTicket,
  type ZammadUser,
} from "./schemas";
import { zammadBaseUrl, zammadGetJson } from "./client";
import {
  zammadBucketDefinition,
  zammadBucketFilterAllows,
  zammadBucketPageQuery,
  zammadTicketListPath,
  type ZammadBucketDefinition,
} from "./ticket-search-query";

function pageFromCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 1;
  }

  const page = Number(cursor);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    providerKey: context.connection.providerKey,
  };
}

function isFullPayload(
  payload: unknown,
): payload is {
  assets: ZammadAssets;
  record_ids?: Array<string | number>;
  total_count?: number;
} {
  return zammadFullTicketPayloadSchema.safeParse(payload).success;
}

function orderedAssetRecords<T>(
  records: Record<string, T> | undefined,
  recordIds: Array<string | number> | undefined,
): T[] {
  if (!records) {
    return [];
  }
  if (recordIds && recordIds.length > 0) {
    return recordIds
      .map((id) => records[String(id)])
      .filter((record): record is T => Boolean(record));
  }

  return Object.values(records);
}

function ticketPayloadRecords(payload: unknown): {
  assets?: ZammadAssets;
  tickets: ZammadTicket[];
  totalCount?: number;
} {
  if (Array.isArray(payload)) {
    return { tickets: payload };
  }
  if (isFullPayload(payload)) {
    return {
      assets: payload.assets,
      tickets: orderedAssetRecords(payload.assets.Ticket, payload.record_ids),
      totalCount: payload.total_count,
    };
  }

  return { tickets: [] };
}

function nextTicketListCursor(
  page: number,
  limit: number,
  loadedCount: number,
  totalCount: number | undefined,
) {
  if (totalCount !== undefined) {
    return page * limit < totalCount ? String(page + 1) : undefined;
  }

  return loadedCount === limit ? String(page + 1) : undefined;
}

function articlePayloadRecords(payload: unknown): {
  articles: ZammadArticle[];
  assets?: ZammadAssets;
} {
  if (Array.isArray(payload)) {
    return { articles: payload };
  }
  if (isFullPayload(payload)) {
    return {
      articles: orderedAssetRecords(
        payload.assets.TicketArticle,
        payload.record_ids,
      ),
      assets: payload.assets,
    };
  }

  return { articles: [] };
}

function collectUserIdsFromTickets(tickets: ZammadTicket[]): string[] {
  return [
    ...new Set(
      tickets
        .flatMap((ticket) => [ticket.customer_id, ticket.owner_id])
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(String),
    ),
  ];
}

function collectNamedAssetIds(
  tickets: ZammadTicket[],
  idField: "state_id" | "priority_id",
) {
  return [
    ...new Set(
      tickets
        .map((ticket) => ticket[idField])
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(String),
    ),
  ];
}

function collectUserIdsFromArticles(articles: ZammadArticle[]): string[] {
  return [
    ...new Set(
      articles
        .map((article) => article.created_by_id)
        .filter((id): id is string | number => id !== null && id !== undefined)
        .map(String),
    ),
  ];
}

function namedAssetMap(
  assets: ZammadGenericNamedAsset[],
): Record<string, ZammadGenericNamedAsset> {
  return Object.fromEntries(
    assets
      .map((asset) => [relationId(asset.id), asset] as const)
      .filter((entry): entry is [string, ZammadGenericNamedAsset] =>
        Boolean(entry[0]),
      ),
  );
}

async function fetchZammadUsers(
  context: ProviderContext,
  userIds: string[],
  operation: "list" | "detail",
): Promise<Record<string, ZammadUser>> {
  if (userIds.length === 0) {
    return {};
  }

  return measureTicketReadPhase(
    "provider-user-lookup-request",
    { ...timingMetadata(context), operation },
    async () => {
      const entries = await Promise.all(
        userIds.map(async (userId) => {
          const rawUser = await zammadGetJson(
            context,
            `/api/v1/users/${encodeURIComponent(userId)}`,
          );
          const parsed = zammadUserSchema.safeParse(rawUser);
          if (!parsed.success) {
            throw providerDataMismatch();
          }
          return [userId, parsed.data] as const;
        }),
      );

      return Object.fromEntries(entries);
    },
  );
}

async function fetchZammadNamedAssets(
  context: ProviderContext,
  path: string,
  operation: "list" | "detail",
): Promise<Record<string, ZammadGenericNamedAsset>> {
  return measureTicketReadPhase(
    "provider-lookup-request",
    { ...timingMetadata(context), operation },
    async () => {
      const rawAssets = await zammadGetJson(context, path);
      const parsed = zammadGenericNamedAssetListResponseSchema.safeParse(rawAssets);
      if (!parsed.success) {
        throw providerDataMismatch();
      }
      return namedAssetMap(parsed.data);
    },
  );
}

function mergeUserAssets(
  assets: ZammadAssets | undefined,
  users: Record<string, ZammadUser>,
): ZammadAssets {
  return {
    ...assets,
    User: {
      ...assets?.User,
      ...users,
    },
  };
}

function mergeListAssets(
  assets: ZammadAssets | undefined,
  users: Record<string, ZammadUser>,
  states: Record<string, ZammadGenericNamedAsset>,
  priorities: Record<string, ZammadGenericNamedAsset>,
): ZammadAssets {
  return {
    ...mergeUserAssets(assets, users),
    State: {
      ...assets?.State,
      ...states,
    },
    TicketPriority: {
      ...assets?.TicketPriority,
      ...priorities,
    },
  };
}

function missingUserIds(assets: ZammadAssets | undefined, userIds: string[]) {
  return userIds.filter((userId) => !assets?.User?.[userId]);
}

function missingStateIds(assets: ZammadAssets | undefined, tickets: ZammadTicket[]) {
  return collectNamedAssetIds(tickets, "state_id").filter((stateId) =>
    tickets.some(
      (ticket) =>
        relationId(ticket.state_id) === stateId &&
        !namedReferenceValue(ticket.state) &&
        !namedAssetValue(assets?.State, stateId),
    ),
  );
}

function missingPriorityIds(
  assets: ZammadAssets | undefined,
  tickets: ZammadTicket[],
) {
  return collectNamedAssetIds(tickets, "priority_id").filter((priorityId) =>
    tickets.some(
      (ticket) =>
        relationId(ticket.priority_id) === priorityId &&
        !namedReferenceValue(ticket.priority) &&
        !namedAssetValue(assets?.TicketPriority, priorityId) &&
        !namedAssetValue(assets?.Priority, priorityId),
      ),
  );
}

async function mapZammadTicketListPayload(
  context: ProviderContext,
  query: TicketListQuery,
  raw: unknown,
  page: number,
  limit: number,
) {
  const parsed = zammadTicketListResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw providerDataMismatch();
  }
  const payload = ticketPayloadRecords(parsed.data);
  if (query.count?.includeTotal && payload.totalCount === undefined) {
    throw providerDataMismatch();
  }
  const [users, states, priorities] = await Promise.all([
    fetchZammadUsers(
      context,
      missingUserIds(
        payload.assets,
        collectUserIdsFromTickets(payload.tickets),
      ),
      "list",
    ),
    missingStateIds(payload.assets, payload.tickets).length > 0
      ? fetchZammadNamedAssets(context, "/api/v1/ticket_states", "list")
      : Promise.resolve({}),
    missingPriorityIds(payload.assets, payload.tickets).length > 0
      ? fetchZammadNamedAssets(context, "/api/v1/ticket_priorities", "list")
      : Promise.resolve({}),
  ]);
  const assets = mergeListAssets(payload.assets, users, states, priorities);
  const totalCount = query.count?.includeTotal ? payload.totalCount : undefined;

  return {
    tickets: payload.tickets.map((ticket) =>
      mapTicketListItem(ticket, zammadBaseUrl(context), assets),
    ),
    loadedCount: payload.tickets.length,
    totalCount,
    nextCursor: nextTicketListCursor(
      page,
      limit,
      payload.tickets.length,
      totalCount,
    ),
    measuredAt: new Date(),
  };
}

async function readZammadTicketListPage(
  context: ProviderContext,
  query: TicketListQuery,
  page: number,
  limit: number,
  searchQuery?: string,
) {
  const metadata = timingMetadata(context);
  const path = zammadTicketListPath(query, page, limit, searchQuery);
  const raw = await measureTicketReadPhase(
    "provider-list-request",
    { ...metadata, operation: "list" },
    () => zammadGetJson(context, path),
  );

  return measureTicketReadPhase(
    "provider-mapping-parsing",
    { ...metadata, operation: "list" },
    () => mapZammadTicketListPayload(context, query, raw, page, limit),
  );
}

async function zammadBucketDefinitions(
  context: ProviderContext,
  groupKey: TicketListGroupKey,
  query: TicketListQuery,
) {
  const assetPath =
    groupKey === "state"
      ? "/api/v1/ticket_states"
      : groupKey === "priority"
        ? "/api/v1/ticket_priorities"
        : undefined;

  if (!assetPath) {
    throw new ProviderError(
      "unsupported-capability",
      "This grouping is not supported by the helpdesk provider.",
    );
  }

  const assets = await fetchZammadNamedAssets(context, assetPath, "list");
  return Object.values(assets)
    .map((asset) => zammadBucketDefinition(groupKey, asset))
    .filter((bucket): bucket is ZammadBucketDefinition => Boolean(bucket))
    .filter((bucket) => zammadBucketFilterAllows(query, bucket));
}

async function listZammadGroupedTickets(
  context: ProviderContext,
  query: TicketListQuery,
  page: number,
  limit: number,
) {
  if (!query.group) {
    throw providerDataMismatch();
  }

  const buckets = await Promise.all(
    (
      await zammadBucketDefinitions(context, query.group.key, query)
    ).map(async (bucketDefinition): Promise<TicketListBucket> => {
      const bucketQuery = zammadBucketPageQuery(query, bucketDefinition);
      const result = await readZammadTicketListPage(
        context,
        bucketQuery,
        page,
        limit,
        bucketDefinition.searchQuery,
      );

      return {
        key: query.group!.key,
        value: bucketDefinition.value,
        label: bucketDefinition.label,
        tickets: result.tickets,
        loadedCount: result.loadedCount,
        totalCount: result.totalCount,
        nextCursor: result.nextCursor,
      };
    }),
  );

  return {
    tickets: buckets.flatMap((bucket) => bucket.tickets),
    loadedCount: buckets.reduce((total, bucket) => total + bucket.loadedCount, 0),
    totalCount: buckets.reduce(
      (total, bucket) => total + (bucket.totalCount ?? bucket.loadedCount),
      0,
    ),
    buckets,
    measuredAt: new Date(),
  };
}

export async function listZammadTickets(
  context: ProviderContext,
  query: TicketListQuery,
) {
  const page = pageFromCursor(query.cursor);
  const limit = Math.min(Math.max(query.pageSize, 1), 50);

  if (query.group) {
    return listZammadGroupedTickets(context, query, page, limit);
  }

  return readZammadTicketListPage(context, query, page, limit);
}

export async function getZammadTicketDetail(
  context: ProviderContext,
  ticketExternalId: string,
): Promise<TicketDetail> {
  const ticketId = encodeURIComponent(ticketExternalId);
  const metadata = timingMetadata(context);
  const [rawTicket, rawArticles] = await Promise.all([
    measureTicketReadPhase(
      "provider-detail-metadata-request",
      { ...metadata, operation: "detail" },
      () =>
        zammadGetJson(
          context,
          `/api/v1/tickets/${ticketId}?expand=true&full=true`,
        ),
    ),
    measureTicketReadPhase(
      "provider-article-thread-request",
      { ...metadata, operation: "detail" },
      () =>
        zammadGetJson(
          context,
          `/api/v1/ticket_articles/by_ticket/${ticketId}?expand=true&full=true`,
        ),
    ),
  ]);

  return measureTicketReadPhase(
    "provider-mapping-parsing",
    { ...metadata, operation: "detail" },
    async () => {
      const rawTicketPayload = isFullPayload(rawTicket)
        ? ticketPayloadRecords(rawTicket)
        : { tickets: [rawTicket], assets: undefined };
      const rawArticlePayload = articlePayloadRecords(rawArticles);
      const ticket = zammadTicketSchema.safeParse(rawTicketPayload.tickets[0]);
      const articles = zammadArticleListResponseSchema.safeParse(rawArticles);
      if (!ticket.success || !articles.success) {
        throw providerDataMismatch();
      }
      const existingAssets = {
        ...rawTicketPayload.assets,
        ...rawArticlePayload.assets,
        User: {
          ...rawTicketPayload.assets?.User,
          ...rawArticlePayload.assets?.User,
        },
      };
      const users = await fetchZammadUsers(
        context,
        missingUserIds(existingAssets, [
          ...new Set([
            ...collectUserIdsFromTickets([ticket.data]),
            ...collectUserIdsFromArticles(rawArticlePayload.articles),
          ]),
        ]),
        "detail",
      );
      const assets = mergeUserAssets(existingAssets, users);

      return {
        ticket: mapTicket(ticket.data, zammadBaseUrl(context), assets),
        thread: {
          ticketExternalId,
          articles: rawArticlePayload.articles.map((article) =>
            mapArticle(article, assets),
          ),
        },
        links: [],
        subscription: { supported: false, following: false },
        measuredAt: new Date(),
      };
    },
  );
}

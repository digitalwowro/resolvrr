import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketDetail } from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { mapArticle, mapTicket } from "./mapping";
import {
  missingZammadOrganizationIds,
  readOptionalZammadOrganizationAssets,
} from "./organization-assets";
import {
  zammadArticleListResponseSchema,
  zammadFullTicketPayloadSchema,
  zammadTicketSchema,
  zammadUserSchema,
  type ZammadArticle,
  type ZammadAssets,
  type ZammadTicket,
  type ZammadUser,
} from "./schemas";
import { zammadBaseUrl, zammadGetJson } from "./client";
import { readZammadSecondaryTicketData } from "./ticket-secondary";
import { readOptionalZammadReplyPolicy } from "./reply-policy";
import { zammadReplyContext } from "./reply-context";
export { listZammadTickets } from "./ticket-list";

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
} {
  if (Array.isArray(payload)) {
    return { tickets: payload };
  }
  if (isFullPayload(payload)) {
    return {
      assets: payload.assets,
      tickets: orderedAssetRecords(payload.assets.Ticket, payload.record_ids),
    };
  }

  return { tickets: [] };
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

async function fetchZammadUsers(
  context: ProviderContext,
  userIds: string[],
): Promise<Record<string, ZammadUser>> {
  if (userIds.length === 0) {
    return {};
  }

  return measureTicketReadPhase(
    "provider-user-lookup-request",
    { ...timingMetadata(context), operation: "detail" },
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

function mergeDetailAssets(
  assets: ZammadAssets | undefined,
  users: Record<string, ZammadUser>,
  secondaryAssets: ZammadAssets | undefined,
  organizationAssets?: ZammadAssets,
): ZammadAssets {
  return {
    ...assets,
    ...secondaryAssets,
    ...organizationAssets,
    User: {
      ...assets?.User,
      ...secondaryAssets?.User,
      ...users,
    },
    Organization: {
      ...assets?.Organization,
      ...secondaryAssets?.Organization,
      ...organizationAssets?.Organization,
    },
    Group: {
      ...assets?.Group,
      ...secondaryAssets?.Group,
    },
  };
}

function missingUserIds(assets: ZammadAssets | undefined, userIds: string[]) {
  return userIds.filter((userId) => !assets?.User?.[userId]);
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
      const [users, secondary] = await Promise.all([
        fetchZammadUsers(
          context,
          missingUserIds(existingAssets, [
            ...new Set([
              ...collectUserIdsFromTickets([ticket.data]),
              ...collectUserIdsFromArticles(rawArticlePayload.articles),
            ]),
          ]),
        ),
        readZammadSecondaryTicketData(context, ticket.data, existingAssets),
      ]);
      const assetsWithSecondary = mergeDetailAssets(
        existingAssets,
        users,
        secondary.assets,
      );
      const organizationAssets = await readOptionalZammadOrganizationAssets(
        context,
        missingZammadOrganizationIds({
          assets: assetsWithSecondary,
          tickets: [ticket.data],
        }),
        "detail",
      );
      const assets = mergeDetailAssets(
        existingAssets,
        users,
        secondary.assets,
        organizationAssets,
      );
      const managedAddresses = await readOptionalZammadReplyPolicy(context);
      const mappedTicket = {
        ...mapTicket(ticket.data, zammadBaseUrl(context), assets),
        tags: secondary.tags,
      };
      const mappedArticles = rawArticlePayload.articles.map((article) => {
        const mappedArticle = mapArticle(article, assets);
        const replyContext = managedAddresses
          ? zammadReplyContext({
              article,
              customer: mappedTicket.customer,
              managedAddresses,
              mappedArticle,
            })
          : undefined;
        return { ...mappedArticle, ...(replyContext ? { replyContext } : {}) };
      });

      return {
        ticket: mappedTicket,
        thread: {
          ticketExternalId,
          articles: mappedArticles,
        },
        links: secondary.links,
        subscription: secondary.subscription,
        measuredAt: new Date(),
        ...(managedAddresses
          ? { replyPolicy: { providerManagedAddresses: managedAddresses } }
          : {}),
      };
    },
  );
}

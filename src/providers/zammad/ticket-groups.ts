import {
  ProviderError,
  type TicketListBucket,
  type TicketListGroupKey,
  type TicketListQuery,
} from "@/core/providers";
import type { ProviderContext } from "@/core/providers";
import type { ZammadGenericNamedAsset } from "./schemas";
import {
  zammadBucketDefinition,
  zammadBucketFilterAllows,
  zammadBucketPageQuery,
  type ZammadBucketDefinition,
} from "./ticket-search-query";

type FetchNamedAssets = (
  context: ProviderContext,
  path: string,
  operation: "list" | "detail",
) => Promise<Record<string, ZammadGenericNamedAsset>>;

type ReadTicketListPage = (
  context: ProviderContext,
  query: TicketListQuery,
  page: number,
  limit: number,
  searchQuery?: string,
) => Promise<{
  tickets: TicketListBucket["tickets"];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
}>;

type ZammadGroupedTicketsHelpers = {
  fetchNamedAssets: FetchNamedAssets;
  readTicketListPage: ReadTicketListPage;
};

async function zammadBucketDefinitions(
  context: ProviderContext,
  groupKey: TicketListGroupKey,
  query: TicketListQuery,
  fetchNamedAssets: FetchNamedAssets,
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

  const assets = await fetchNamedAssets(context, assetPath, "list");
  return Object.values(assets)
    .map((asset) => zammadBucketDefinition(groupKey, asset))
    .filter((bucket): bucket is ZammadBucketDefinition => Boolean(bucket))
    .filter((bucket) => zammadBucketFilterAllows(query, bucket));
}

export async function listZammadGroupedTickets(
  context: ProviderContext,
  query: TicketListQuery,
  page: number,
  limit: number,
  helpers: ZammadGroupedTicketsHelpers,
) {
  if (!query.group) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk provider returned an unexpected response.",
    );
  }

  const bucketDefinitions = await zammadBucketDefinitions(
    context,
    query.group.key,
    query,
    helpers.fetchNamedAssets,
  );
  const buckets = await Promise.all(
    bucketDefinitions.map(async (bucketDefinition): Promise<TicketListBucket> => {
      const bucketQuery = zammadBucketPageQuery(query, bucketDefinition);
      const result = await helpers.readTicketListPage(
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

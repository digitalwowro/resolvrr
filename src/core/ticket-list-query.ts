import type { SavedViewFilter } from "./saved-views";
import type { TicketListItem } from "./tickets";

export type TicketListFilter = SavedViewFilter;

export type TicketSortKey =
  | "number"
  | "title"
  | "customer"
  | "owner"
  | "group"
  | "createdAt"
  | "updatedAt"
  | "pendingUntil"
  | "state"
  | "priority";

export type TicketSortDirection = "ascending" | "descending";

export type TicketSort = {
  key: TicketSortKey;
  direction: TicketSortDirection;
};

export type TicketListCountRequest = {
  includeTotal: boolean;
};

export type TicketListGroupKey =
  | "state"
  | "priority"
  | "owner"
  | "customer"
  | "group";

export type TicketListGroupRequest = {
  key: TicketListGroupKey;
};

export type TicketListQuery = {
  filter: TicketListFilter;
  pageSize: number;
  cursor?: string;
  sort?: TicketSort;
  count?: TicketListCountRequest;
  group?: TicketListGroupRequest;
};

export type TicketListQueryInput = Partial<
  Omit<TicketListQuery, "filter" | "pageSize">
> & {
  filter?: TicketListFilter;
  pageSize?: number;
  limit?: number;
};

export type TicketListBucket = {
  key: TicketListGroupKey;
  value: string;
  label: string;
  tickets: TicketListItem[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
};

export type TicketListResult = {
  tickets: TicketListItem[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
  buckets?: TicketListBucket[];
  measuredAt: Date;
};

export const defaultTicketListQuery: TicketListQuery = {
  filter: {},
  pageSize: 25,
  sort: { key: "updatedAt", direction: "descending" },
};

export function normalizeTicketListQuery(
  query: TicketListQueryInput = {},
): TicketListQuery {
  const { limit, ...canonicalQuery } = query;

  return {
    ...defaultTicketListQuery,
    ...canonicalQuery,
    filter: query.filter ?? defaultTicketListQuery.filter,
    pageSize: query.pageSize ?? limit ?? defaultTicketListQuery.pageSize,
  };
}

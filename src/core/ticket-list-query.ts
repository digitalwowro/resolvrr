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

export const completeResultTicketSortKeys = [
  "customer",
  "owner",
  "group",
] as const satisfies readonly TicketSortKey[];

export function isCompleteResultTicketSortKey(
  key: TicketSortKey,
): key is (typeof completeResultTicketSortKeys)[number] {
  return completeResultTicketSortKeys.includes(
    key as (typeof completeResultTicketSortKeys)[number],
  );
}

export type TicketListCountRequest = {
  includeTotal: boolean;
};

export type TicketListQueryUnsupportedCombination = "grouped-total-count";

export type TicketListQueryCapabilities = {
  totalCount: boolean;
  providerSort: boolean;
  providerGrouping: boolean;
  groupedTotalCount: boolean;
  fullTextSearch: boolean;
  maxPageSize: number;
  unsupportedCombinations: TicketListQueryUnsupportedCombination[];
};

export type TicketListQueryRejectionKind =
  | "count-unsupported"
  | "sort-unsupported"
  | "grouping-unsupported"
  | "full-text-search-unsupported"
  | "grouped-total-count-too-expensive";

export type TicketListQueryRejection = {
  kind: TicketListQueryRejectionKind;
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

export const ticketListPageSizeLimits = {
  min: 1,
  default: 25,
  max: 50,
} as const;

export const defaultTicketListQueryCapabilities: TicketListQueryCapabilities = {
  totalCount: false,
  providerSort: false,
  providerGrouping: false,
  groupedTotalCount: false,
  fullTextSearch: false,
  maxPageSize: ticketListPageSizeLimits.max,
  unsupportedCombinations: ["grouped-total-count"],
};

export const defaultTicketListQuery: TicketListQuery = {
  filter: {},
  pageSize: ticketListPageSizeLimits.default,
  sort: { key: "updatedAt", direction: "descending" },
};

export function constrainTicketListPageSize(value: number): number {
  if (!Number.isFinite(value)) {
    return ticketListPageSizeLimits.default;
  }

  const integerValue = Math.trunc(value);
  return Math.min(
    Math.max(integerValue, ticketListPageSizeLimits.min),
    ticketListPageSizeLimits.max,
  );
}

export function normalizeTicketListQuery(
  query: TicketListQueryInput = {},
): TicketListQuery {
  const normalized: TicketListQuery = {
    filter: query.filter ?? defaultTicketListQuery.filter,
    pageSize: constrainTicketListPageSize(
      query.pageSize ?? query.limit ?? defaultTicketListQuery.pageSize,
    ),
    sort: query.sort ?? defaultTicketListQuery.sort,
  };

  if (query.cursor) {
    normalized.cursor = query.cursor;
  }
  if (query.count) {
    normalized.count = query.count;
  }
  if (query.group) {
    normalized.group = query.group;
  }

  return normalized;
}

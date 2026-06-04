import {
  type TicketListGroupKey,
  type TicketListQuery,
  type TicketSortKey,
} from "@/core/providers";
import {
  ticketPriorityDefinitions,
  ticketStateDefinitions,
  type TicketPriority,
  type TicketState,
} from "@/core/tickets";
import { mapPriority, mapState } from "./mapping";
import type { ZammadGenericNamedAsset } from "./schemas";

export type ZammadBucketDefinition =
  | {
      key: "state";
      value: TicketState;
      label: string;
      searchQuery: string;
    }
  | {
      key: "priority";
      value: TicketPriority;
      label: string;
      searchQuery: string;
    };

const zammadTicketSortFields: Record<TicketSortKey, string> = {
  number: "number",
  title: "title",
  customer: "customer_id",
  owner: "owner_id",
  group: "group_id",
  createdAt: "created_at",
  updatedAt: "updated_at",
  pendingUntil: "pending_time",
  state: "state_id",
  priority: "priority_id",
};

const zammadStateSearchName: Record<TicketState, string> = {
  new: "new",
  open: "open",
  pending_reminder: "pending reminder",
  pending_close: "pending close",
  closed: "closed",
};

const zammadPrioritySearchName: Record<TicketPriority, string> = {
  low: "1 low",
  medium: "2 normal",
  high: "3 high",
};

function zammadSearchQuotedValue(value: string) {
  return `"${value.replace(/["\\]/gu, "\\$&")}"`;
}

function zammadSearchField(field: string, values: string[]) {
  if (values.length === 1) {
    return `${field}:${zammadSearchQuotedValue(values[0]!)}`;
  }

  return `${field}:(${values.map(zammadSearchQuotedValue).join(" OR ")})`;
}

function zammadSearchRawField(field: string, value: string) {
  return `${field}:${value}`;
}

function zammadSearchNot(clause: string) {
  return `NOT (${clause})`;
}

function zammadTicketSearchQuery(query: TicketListQuery, baseQuery?: string) {
  const parts = baseQuery && baseQuery !== "*" ? [baseQuery] : [];

  if (query.filter.states?.length) {
    parts.push(
      zammadSearchField(
        "state.name",
        query.filter.states.map((state) => zammadStateSearchName[state]),
      ),
    );
  }
  if (query.filter.excludedStates?.length) {
    parts.push(
      zammadSearchNot(
        zammadSearchField(
          "state.name",
          query.filter.excludedStates.map((state) => zammadStateSearchName[state]),
        ),
      ),
    );
  }
  if (query.filter.priorities?.length) {
    parts.push(
      zammadSearchField(
        "priority.name",
        query.filter.priorities.map(
          (priority) => zammadPrioritySearchName[priority],
        ),
      ),
    );
  }
  if (query.filter.excludedPriorities?.length) {
    parts.push(
      zammadSearchNot(
        zammadSearchField(
          "priority.name",
          query.filter.excludedPriorities.map(
            (priority) => zammadPrioritySearchName[priority],
          ),
        ),
      ),
    );
  }
  if (query.filter.ownerExternalIds?.length) {
    parts.push(zammadSearchField("owner_id", query.filter.ownerExternalIds));
  }
  if (query.filter.excludedOwnerExternalIds?.length) {
    parts.push(
      zammadSearchNot(
        zammadSearchField("owner_id", query.filter.excludedOwnerExternalIds),
      ),
    );
  }
  if (query.filter.ownerUnassigned) {
    parts.push(zammadSearchRawField("owner_id", "null"));
  }
  if (query.filter.excludeOwnerUnassigned) {
    parts.push(zammadSearchNot(zammadSearchRawField("owner_id", "null")));
  }
  if (query.filter.groupExternalIds?.length) {
    parts.push(zammadSearchField("group_id", query.filter.groupExternalIds));
  }
  if (query.filter.excludedGroupExternalIds?.length) {
    parts.push(
      zammadSearchNot(
        zammadSearchField("group_id", query.filter.excludedGroupExternalIds),
      ),
    );
  }

  return parts.length > 0 ? parts.join(" AND ") : "*";
}

export function zammadTicketListPath(
  query: TicketListQuery,
  page: number,
  limit: number,
  searchQuery?: string,
) {
  const effectiveSearchQuery = zammadTicketSearchQuery(query, searchQuery);
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(limit),
    expand: "true",
    full: "true",
  });

  const useSearch = Boolean(
    query.sort || query.count?.includeTotal || effectiveSearchQuery !== "*",
  );

  if (!useSearch) {
    return `/api/v1/tickets?${params}`;
  }

  params.set("query", effectiveSearchQuery);
  if (query.count?.includeTotal) {
    params.set("with_total_count", "true");
  }
  if (query.sort) {
    params.set("sort_by", zammadTicketSortFields[query.sort.key]);
    params.set(
      "order_by",
      query.sort.direction === "ascending" ? "asc" : "desc",
    );
  }

  return `/api/v1/tickets/search?${params}`;
}

export function zammadBucketDefinition(
  groupKey: TicketListGroupKey,
  asset: ZammadGenericNamedAsset,
): ZammadBucketDefinition | undefined {
  if (!asset.name) {
    return undefined;
  }

  if (groupKey === "state") {
    const value = mapState(asset.name);
    return value
      ? {
          key: "state",
          label: ticketStateDefinitions[value].label,
          searchQuery: `state.name:${zammadSearchQuotedValue(asset.name)}`,
          value,
        }
      : undefined;
  }

  if (groupKey === "priority") {
    const value = mapPriority(asset.name);
    return value
      ? {
          key: "priority",
          label: ticketPriorityDefinitions[value].label,
          searchQuery: `priority.name:${zammadSearchQuotedValue(asset.name)}`,
          value,
        }
      : undefined;
  }

  return undefined;
}

export function zammadBucketFilterAllows(
  query: TicketListQuery,
  bucket: ZammadBucketDefinition,
) {
  if (bucket.key === "state") {
    return (
      (!query.filter.states || query.filter.states.includes(bucket.value)) &&
      !query.filter.excludedStates?.includes(bucket.value)
    );
  }

  return (
    (!query.filter.priorities ||
      query.filter.priorities.includes(bucket.value)) &&
    !query.filter.excludedPriorities?.includes(bucket.value)
  );
}

export function zammadBucketPageQuery(
  query: TicketListQuery,
  bucket: ZammadBucketDefinition,
): TicketListQuery {
  return {
    ...query,
    count: { includeTotal: true },
    filter: {
      ...query.filter,
      ...(bucket.key === "state" ? { states: undefined } : {}),
      ...(bucket.key === "priority" ? { priorities: undefined } : {}),
    },
  };
}

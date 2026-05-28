import type { TicketPriority, TicketState } from "./tickets";
import type {
  TicketListGroupKey,
  TicketListGroupRequest,
  TicketSort,
  TicketSortDirection,
  TicketSortKey,
} from "./ticket-list-query";

export type SavedViewVisibility = "personal" | "shared";

export type SavedViewFilter = {
  states?: TicketState[];
  priorities?: TicketPriority[];
  ownerExternalIds?: string[];
  groupExternalIds?: string[];
  tagNames?: string[];
  searchText?: string;
};

export type SavedViewQuery = {
  filter: SavedViewFilter;
  sort?: TicketSort;
  group?: TicketListGroupRequest;
};

export type SavedView = {
  id: string;
  name: string;
  visibility: SavedViewVisibility;
  filter: SavedViewFilter;
  query: SavedViewQuery;
  sort?: TicketSort;
  group?: TicketListGroupRequest;
  iconName?: string;
  colorName?: string;
};

export const savedViewStorageVersion = 1;

export type SavedViewStorage = {
  version: typeof savedViewStorageVersion;
  filter: SavedViewFilter;
  sort?: TicketSort;
  group?: TicketListGroupRequest;
};

const ticketSortKeys = [
  "number",
  "title",
  "customer",
  "owner",
  "group",
  "createdAt",
  "updatedAt",
  "pendingUntil",
  "state",
  "priority",
] satisfies TicketSortKey[];

const ticketSortDirections = [
  "ascending",
  "descending",
] satisfies TicketSortDirection[];

const ticketGroupKeys = [
  "state",
  "priority",
  "owner",
  "customer",
  "group",
] satisfies TicketListGroupKey[];

function stringList(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const values = value.filter(
    (item): item is string => typeof item === "string" && item.length > 0,
  );

  return values.length > 0 ? [...new Set(values)] : undefined;
}

function canonicalList<const T extends string>(
  value: unknown,
  allowed: readonly T[],
): T[] | undefined {
  const values = stringList(value)?.filter((item): item is T =>
    allowed.includes(item as T),
  );

  return values && values.length > 0 ? values : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isAllowed<const T extends string>(
  value: unknown,
  allowed: readonly T[],
): value is T {
  return typeof value === "string" && allowed.includes(value as T);
}

export function normalizeSavedViewFilter(
  filter: Partial<SavedViewFilter> = {},
): SavedViewFilter {
  return {
    ...(canonicalList(filter.states, [
      "new",
      "open",
      "pending_reminder",
      "pending_close",
      "closed",
    ] satisfies TicketState[])?.length
      ? {
          states: canonicalList(filter.states, [
            "new",
            "open",
            "pending_reminder",
            "pending_close",
            "closed",
          ] satisfies TicketState[]),
        }
      : {}),
    ...(canonicalList(filter.priorities, [
      "low",
      "medium",
      "high",
    ] satisfies TicketPriority[])?.length
      ? {
          priorities: canonicalList(filter.priorities, [
            "low",
            "medium",
            "high",
          ] satisfies TicketPriority[]),
        }
      : {}),
    ...(stringList(filter.ownerExternalIds)
      ? { ownerExternalIds: stringList(filter.ownerExternalIds) }
      : {}),
    ...(stringList(filter.groupExternalIds)
      ? { groupExternalIds: stringList(filter.groupExternalIds) }
      : {}),
    ...(stringList(filter.tagNames) ? { tagNames: stringList(filter.tagNames) } : {}),
    ...(typeof filter.searchText === "string" && filter.searchText.trim()
      ? { searchText: filter.searchText.trim() }
      : {}),
  };
}

export function normalizeSavedViewSort(sort: unknown): TicketSort | undefined {
  if (!isRecord(sort)) {
    return undefined;
  }
  if (
    !isAllowed(sort.key, ticketSortKeys) ||
    !isAllowed(sort.direction, ticketSortDirections)
  ) {
    return undefined;
  }

  return {
    key: sort.key,
    direction: sort.direction,
  };
}

export function normalizeSavedViewGroup(
  group: unknown,
): TicketListGroupRequest | undefined {
  if (!isRecord(group) || !isAllowed(group.key, ticketGroupKeys)) {
    return undefined;
  }

  return { key: group.key };
}

export function savedViewStorageFromQuery(
  query: SavedViewQuery,
): SavedViewStorage {
  const sort = normalizeSavedViewSort(query.sort);
  const group = normalizeSavedViewGroup(query.group);

  return {
    version: savedViewStorageVersion,
    filter: normalizeSavedViewFilter(query.filter),
    ...(sort ? { sort } : {}),
    ...(group ? { group } : {}),
  };
}

export function savedViewQueryFromStorage(value: unknown): SavedViewQuery {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { filter: {} };
  }

  const stored = value as Partial<SavedViewStorage> & Partial<SavedViewFilter>;
  const filterSource =
    stored.version === savedViewStorageVersion ? stored.filter : stored;
  const filter = normalizeSavedViewFilter(filterSource ?? {});
  const sort =
    stored.version === savedViewStorageVersion
      ? normalizeSavedViewSort(stored.sort)
      : undefined;
  const group =
    stored.version === savedViewStorageVersion
      ? normalizeSavedViewGroup(stored.group)
      : undefined;

  return {
    filter,
    ...(sort ? { sort } : {}),
    ...(group ? { group } : {}),
  };
}

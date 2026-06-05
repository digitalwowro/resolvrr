import type { TicketPriority, TicketState } from "./tickets";
import type {
  TicketListGroupKey,
  TicketListGroupRequest,
  TicketSort,
  TicketSortDirection,
  TicketSortKey,
} from "./ticket-list-query";
import {
  savedViewColorNames,
  savedViewStorageVersion,
  type SavedViewColorName,
  type SavedViewFilter,
  type SavedViewQuery,
  type SavedViewStorage,
} from "./saved-view-types";
import { normalizeSavedViewConditions } from "./saved-view-condition-normalization";

export { normalizeSavedViewConditions } from "./saved-view-condition-normalization";
export * from "./saved-view-types";

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

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
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
  const states = canonicalList(filter.states, [
    "new",
    "open",
    "pending_reminder",
    "pending_close",
    "closed",
  ] satisfies TicketState[]);
  const excludedStates = canonicalList(filter.excludedStates, [
    "new",
    "open",
    "pending_reminder",
    "pending_close",
    "closed",
  ] satisfies TicketState[]);
  const priorities = canonicalList(filter.priorities, [
    "low",
    "medium",
    "high",
  ] satisfies TicketPriority[]);
  const excludedPriorities = canonicalList(filter.excludedPriorities, [
    "low",
    "medium",
    "high",
  ] satisfies TicketPriority[]);

  return {
    ...(states?.length ? { states } : {}),
    ...(excludedStates?.length ? { excludedStates } : {}),
    ...(priorities?.length ? { priorities } : {}),
    ...(excludedPriorities?.length ? { excludedPriorities } : {}),
    ...(stringList(filter.ownerExternalIds)
      ? { ownerExternalIds: stringList(filter.ownerExternalIds) }
      : {}),
    ...(stringList(filter.excludedOwnerExternalIds)
      ? { excludedOwnerExternalIds: stringList(filter.excludedOwnerExternalIds) }
      : {}),
    ...(booleanValue(filter.ownerUnassigned)
      ? { ownerUnassigned: true }
      : {}),
    ...(booleanValue(filter.excludeOwnerUnassigned)
      ? { excludeOwnerUnassigned: true }
      : {}),
    ...(stringList(filter.groupExternalIds)
      ? { groupExternalIds: stringList(filter.groupExternalIds) }
      : {}),
    ...(stringList(filter.excludedGroupExternalIds)
      ? { excludedGroupExternalIds: stringList(filter.excludedGroupExternalIds) }
      : {}),
    ...(stringList(filter.tagNames) ? { tagNames: stringList(filter.tagNames) } : {}),
    ...(typeof filter.searchText === "string" && filter.searchText.trim()
      ? { searchText: filter.searchText.trim() }
      : {}),
  };
}

export function isSavedViewColorName(value: unknown): value is SavedViewColorName {
  return (
    typeof value === "string" &&
    savedViewColorNames.includes(value as SavedViewColorName)
  );
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
  const conditions = normalizeSavedViewConditions(query.conditions);

  return {
    version: savedViewStorageVersion,
    filter: normalizeSavedViewFilter(query.filter),
    ...(conditions ? { conditions } : {}),
    ...(sort ? { sort } : {}),
    ...(group ? { group } : {}),
  };
}

export function savedViewQueryFromStorage(value: unknown): SavedViewQuery {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { filter: {} };
  }

  const stored = value as Partial<SavedViewStorage> & Partial<SavedViewFilter>;
  const storedVersion = (stored as { version?: unknown }).version;
  const versioned = storedVersion === savedViewStorageVersion;
  const legacyVersioned = storedVersion === 1;
  const filterSource = versioned || legacyVersioned ? stored.filter : stored;
  const filter = normalizeSavedViewFilter(filterSource ?? {});
  const sort = versioned || legacyVersioned
    ? normalizeSavedViewSort(stored.sort)
    : undefined;
  const group = versioned || legacyVersioned
    ? normalizeSavedViewGroup(stored.group)
    : undefined;
  const conditions = versioned
    ? normalizeSavedViewConditions(stored.conditions)
    : undefined;

  return {
    filter,
    ...(conditions ? { conditions } : {}),
    ...(sort ? { sort } : {}),
    ...(group ? { group } : {}),
  };
}

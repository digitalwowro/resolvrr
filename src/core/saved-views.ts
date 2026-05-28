import type { TicketPriority, TicketState } from "./tickets";
import type { TicketListGroupRequest, TicketSort } from "./ticket-list-query";

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

export function savedViewStorageFromQuery(
  query: SavedViewQuery,
): SavedViewStorage {
  return {
    version: savedViewStorageVersion,
    filter: normalizeSavedViewFilter(query.filter),
    ...(query.sort ? { sort: query.sort } : {}),
    ...(query.group ? { group: query.group } : {}),
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

  return {
    filter,
    ...(stored.version === savedViewStorageVersion && stored.sort
      ? { sort: stored.sort }
      : {}),
    ...(stored.version === savedViewStorageVersion && stored.group
      ? { group: stored.group }
      : {}),
  };
}

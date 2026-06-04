import type { TicketPriority, TicketState } from "./tickets";
import type {
  TicketListGroupKey,
  TicketListGroupRequest,
  TicketSort,
  TicketSortDirection,
  TicketSortKey,
} from "./ticket-list-query";

export type SavedViewVisibility = "personal" | "shared";

export type SavedViewConditionField = "owner" | "state" | "priority" | "group";

export type SavedViewConditionOperator = "is" | "is_not";

export type SavedViewOwnerPreset = "myself" | "unassigned" | "all";

export type SavedViewConditionValue =
  | { kind: "owner-preset"; value: SavedViewOwnerPreset }
  | { kind: "external"; externalId: string; label?: string }
  | { kind: "state"; value: TicketState }
  | { kind: "priority"; value: TicketPriority };

export type SavedViewCondition = {
  id: string;
  field: SavedViewConditionField;
  operator: SavedViewConditionOperator;
  values: SavedViewConditionValue[];
};

export type SavedViewFilter = {
  states?: TicketState[];
  excludedStates?: TicketState[];
  priorities?: TicketPriority[];
  excludedPriorities?: TicketPriority[];
  ownerExternalIds?: string[];
  excludedOwnerExternalIds?: string[];
  ownerUnassigned?: boolean;
  excludeOwnerUnassigned?: boolean;
  groupExternalIds?: string[];
  excludedGroupExternalIds?: string[];
  tagNames?: string[];
  searchText?: string;
};

export type SavedViewQuery = {
  filter: SavedViewFilter;
  conditions?: SavedViewCondition[];
  sort?: TicketSort;
  group?: TicketListGroupRequest;
};

export type SavedView = {
  id: string;
  name: string;
  visibility: SavedViewVisibility;
  filter: SavedViewFilter;
  query: SavedViewQuery;
  conditions?: SavedViewCondition[];
  sort?: TicketSort;
  group?: TicketListGroupRequest;
  iconName?: string;
  colorName?: string;
  seedKey?: string;
};

export const savedViewStorageVersion = 2;
export const myWorkSavedViewSeedKey = "my-work";
export const savedViewSeedDismissalPreferenceKey = "savedView.dismissedSeeds";
export const savedViewMaxConditions = 12;
export const savedViewMaxValuesPerCondition = 20;
export const savedViewTitleMaxLength = 80;

export const savedViewConditionFields = [
  "owner",
  "state",
  "priority",
  "group",
] satisfies SavedViewConditionField[];

export const savedViewConditionOperators = [
  "is",
  "is_not",
] satisfies SavedViewConditionOperator[];

export const savedViewColorNames = [
  "blue",
  "green",
  "amber",
  "violet",
  "rose",
  "teal",
  "slate",
  "orange",
] as const;

export const curatedSavedViewIconNames = [
  "briefcase-business",
  "inbox",
  "list-filter",
  "clock",
  "circle-dot",
  "signal-high",
  "users",
  "tag",
] as const;

export type SavedViewColorName = (typeof savedViewColorNames)[number];

export type SavedViewStorage = {
  version: typeof savedViewStorageVersion;
  filter: SavedViewFilter;
  conditions?: SavedViewCondition[];
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

function normalizeConditionValue(
  field: SavedViewConditionField,
  value: unknown,
): SavedViewConditionValue | undefined {
  if (!isRecord(value) || typeof value.kind !== "string") {
    return undefined;
  }

  if (field === "owner" && value.kind === "owner-preset") {
    return isAllowed(value.value, ["myself", "unassigned", "all"] as const)
      ? { kind: "owner-preset", value: value.value }
      : undefined;
  }
  if (
    (field === "owner" || field === "group") &&
    value.kind === "external" &&
    typeof value.externalId === "string" &&
    value.externalId.trim()
  ) {
    return {
      kind: "external",
      externalId: value.externalId.trim(),
      ...(typeof value.label === "string" && value.label.trim()
        ? { label: value.label.trim() }
        : {}),
    };
  }
  if (
    field === "state" &&
    value.kind === "state" &&
    isAllowed(value.value, [
      "new",
      "open",
      "pending_reminder",
      "pending_close",
      "closed",
    ] satisfies TicketState[])
  ) {
    return { kind: "state", value: value.value };
  }
  if (
    field === "priority" &&
    value.kind === "priority" &&
    isAllowed(value.value, [
      "low",
      "medium",
      "high",
    ] satisfies TicketPriority[])
  ) {
    return { kind: "priority", value: value.value };
  }

  return undefined;
}

export function normalizeSavedViewConditions(
  conditions: unknown,
): SavedViewCondition[] | undefined {
  if (!Array.isArray(conditions)) {
    return undefined;
  }

  const normalized = conditions
    .slice(0, savedViewMaxConditions)
    .map((condition, index): SavedViewCondition | undefined => {
      if (
        !isRecord(condition) ||
        !isAllowed(condition.field, savedViewConditionFields) ||
        !isAllowed(condition.operator, savedViewConditionOperators) ||
        !Array.isArray(condition.values)
      ) {
        return undefined;
      }

      const field = condition.field;
      const operator = condition.operator;
      const values = condition.values
        .slice(0, savedViewMaxValuesPerCondition)
        .map((value) => normalizeConditionValue(field, value))
        .filter((value): value is SavedViewConditionValue => Boolean(value));

      if (values.length === 0) {
        return undefined;
      }

      return {
        id:
          typeof condition.id === "string" && condition.id.trim()
            ? condition.id.trim()
            : `condition-${index + 1}`,
        field,
        operator,
        values,
      };
    })
    .filter((condition): condition is SavedViewCondition => Boolean(condition));

  return normalized.length > 0 ? normalized : undefined;
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

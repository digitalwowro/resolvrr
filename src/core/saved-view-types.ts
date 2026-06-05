import type { TicketPriority, TicketState } from "./tickets";
import type {
  TicketListGroupRequest,
  TicketSort,
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

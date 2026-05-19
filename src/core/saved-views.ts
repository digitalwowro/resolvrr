import type { TicketPriority, TicketState } from "./tickets";

export type SavedViewVisibility = "personal" | "shared";

export type SavedViewFilter = {
  states?: TicketState[];
  priorities?: TicketPriority[];
  ownerExternalIds?: string[];
  groupExternalIds?: string[];
  tagNames?: string[];
  searchText?: string;
};

export type SavedView = {
  id: string;
  name: string;
  visibility: SavedViewVisibility;
  filter: SavedViewFilter;
  iconName?: string;
  colorName?: string;
};

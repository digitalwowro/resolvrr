import type { WorkspaceTicketListSort } from "./list-page-action-result";
import type { TicketReadUnavailable } from "./read-model";
import type { WorkspaceTicketRow } from "./workspace-adapter";

export type WorkspaceTicketSearchRequest = {
  mode: "quick" | "detailed";
  query: string;
  cursor?: string;
  sort?: WorkspaceTicketListSort;
};

export type WorkspaceTicketSearchAvailable = {
  status: "available";
  rows: WorkspaceTicketRow[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
  appliedSort?: WorkspaceTicketListSort;
};

export type WorkspaceTicketSearchResult =
  | WorkspaceTicketSearchAvailable
  | TicketReadUnavailable;

export type SearchWorkspaceTicketsAction = (
  request: WorkspaceTicketSearchRequest,
) => Promise<WorkspaceTicketSearchResult>;

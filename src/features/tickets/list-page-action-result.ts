import type {
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "./workspace-adapter";
import type { TicketReadUnavailable } from "./read-model";

export type WorkspaceTicketListSort = {
  key: WorkspaceTicketSortKey;
  direction: "ascending" | "descending";
};

export type WorkspaceTicketListPageRequest = {
  cursor?: string;
  sort?: WorkspaceTicketListSort;
};

export type WorkspaceTicketListPageAvailable = {
  status: "available";
  rows: WorkspaceTicketRow[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
};

export type WorkspaceTicketListPageLoadResult =
  | WorkspaceTicketListPageAvailable
  | TicketReadUnavailable;

export type LoadWorkspaceTicketListPageAction = (
  request: WorkspaceTicketListPageRequest,
) => Promise<WorkspaceTicketListPageLoadResult>;

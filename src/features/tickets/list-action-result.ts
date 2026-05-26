import type { TicketReadUnavailable } from "./read-model";
import type { WorkspaceTicketRow, WorkspaceTicketTab } from "./workspace-adapter";

export type WorkspaceTicketListPage = {
  rows: WorkspaceTicketRow[];
  tabs: WorkspaceTicketTab[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
};

export type WorkspaceTicketListPageLoadResult =
  | {
      status: "available";
      page: WorkspaceTicketListPage;
    }
  | TicketReadUnavailable;

export type LoadWorkspaceTicketListPageAction = (
  cursor: string,
) => Promise<WorkspaceTicketListPageLoadResult>;

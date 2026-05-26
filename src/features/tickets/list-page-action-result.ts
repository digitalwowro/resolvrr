import type { WorkspaceTicketRow } from "./workspace-adapter";
import type { TicketReadUnavailable } from "./read-model";

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
  cursor: string,
) => Promise<WorkspaceTicketListPageLoadResult>;

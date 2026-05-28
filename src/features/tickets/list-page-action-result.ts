import type {
  WorkspaceTicketRow,
  WorkspaceTicketGroupKey,
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
  group?: Extract<WorkspaceTicketGroupKey, "state" | "priority">;
  bucketValue?: string;
  savedViewId?: string;
};

export type WorkspaceTicketListGroup = {
  id: string;
  key: Extract<WorkspaceTicketGroupKey, "state" | "priority">;
  value: string;
  label: string;
  rows: WorkspaceTicketRow[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
};

export type WorkspaceTicketListPageAvailable = {
  status: "available";
  rows: WorkspaceTicketRow[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
  groups?: WorkspaceTicketListGroup[];
  appliedGroupBy?: WorkspaceTicketGroupKey;
  appliedSavedViewId?: string;
  appliedSort?: WorkspaceTicketListSort;
};

export type WorkspaceTicketListPageLoadResult =
  | WorkspaceTicketListPageAvailable
  | TicketReadUnavailable;

export type LoadWorkspaceTicketListPageAction = (
  request: WorkspaceTicketListPageRequest,
) => Promise<WorkspaceTicketListPageLoadResult>;

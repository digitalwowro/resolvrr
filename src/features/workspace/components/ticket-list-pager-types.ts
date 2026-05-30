import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
} from "@/features/tickets/list-page-action-result";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";

export type TicketListPagerProps = {
  initialSavedViewId: string;
  initialRows: WorkspaceTicketRow[];
  initialGroups?: WorkspaceTicketListGroup[];
  initialNextCursor?: string;
  initialTotalCount?: number;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
};

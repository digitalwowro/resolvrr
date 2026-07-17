import type {
  LoadWorkspaceTicketDetailHydrationAction,
  WorkspaceTicketDetailHydrationResult,
} from "@/features/workspace/ticket-detail-hydration";
import type { WorkspaceTicketListSort } from "@/features/tickets/list-page-action-result";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import type {
  SaveWorkspaceOpenTabsStateAction,
  WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";

export type ActiveWorkspacePane = "list" | { ticketId: string };

export type TicketWorkspaceStateProps = {
  columns: WorkspaceTicketColumn[];
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailHydrationResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailHydrationAction;
  localSortEnabled: boolean;
  onProviderSortChange(sort: WorkspaceTicketListSort): void;
  providerSortEnabled: boolean;
  refreshTicketDetailAfterMetadataSave: boolean;
  rows: WorkspaceTicketRow[];
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  selectedTicketId?: string;
  ticketTabs: WorkspaceTicketTab[];
  workspaceId?: string;
};

import type { WorkspaceTicketDetailLoadResult } from "@/features/tickets/detail-action-result";
import type { WorkspaceTicketListSort } from "@/features/tickets/list-page-action-result";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import type { LoadWorkspaceTicketDetailAction } from "@/features/tickets/detail-action-result";
import type {
  SaveWorkspaceOpenTabsStateAction,
  WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";

export type ActiveWorkspacePane = "list" | { ticketId: string };

export type TicketWorkspaceStateProps = {
  columns: WorkspaceTicketColumn[];
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  localSortEnabled: boolean;
  onProviderSortChange(sort: WorkspaceTicketListSort): void;
  providerSortEnabled: boolean;
  refreshTicketDetailAfterMetadataSave: boolean;
  rows: WorkspaceTicketRow[];
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  selectedTicketId?: string;
  ticketTabs: WorkspaceTicketTab[];
};

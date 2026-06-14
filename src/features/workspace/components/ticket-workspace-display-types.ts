import type { WorkspaceSavedView } from "@/features/saved-views/workspace";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
} from "@/features/tickets/list-page-action-result";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
} from "@/features/tickets/link-target-search-action-result";
import type {
  RewriteDraftAction,
  SummarizeWorkspaceTicketAction,
  TicketAiSummaryResult,
} from "@/features/ai";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type {
  SaveWorkspaceOpenTabsStateAction,
  WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import type {
  LoadWorkspaceNotificationsAction,
  MarkWorkspaceNotificationsReadAction,
} from "@/features/notifications";
import type { HelpdeskConnectionActionResult } from "@/features/helpdesk-connections";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import type { WorkspaceSettingsSection } from "./workspace-settings-dialog";
import type { WorkspaceMenuConnection } from "./workspace-header";

export type TicketWorkspaceDisplayProps = {
  connections: WorkspaceMenuConnection[];
  columns: WorkspaceTicketColumn[];
  communicationCapabilities: TicketCommunicationCapabilities;
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  loadWorkspaceNotificationsAction: LoadWorkspaceNotificationsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  markWorkspaceNotificationsReadAction: MarkWorkspaceNotificationsReadAction;
  onOpenSettings(section: WorkspaceSettingsSection): void;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  initialListGroups?: WorkspaceTicketListGroup[];
  nextListCursor?: string;
  providerGroupingEnabled: boolean;
  providerSortEnabled: boolean;
  refreshTicketDetailAfterMetadataSave: boolean;
  rows: WorkspaceTicketRow[];
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  rewriteDraftAction?: RewriteDraftAction;
  summarizeTicketAction: SummarizeWorkspaceTicketAction;
  initialTicketAiSummary?: {
    result: Extract<TicketAiSummaryResult, { status: "available" }>;
    ticketId: string;
  };
  savedViews: WorkspaceSavedView[];
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  selectedSavedViewId: string;
  selectedTicketId?: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  tabs: WorkspaceTicketTab[];
  totalListCount?: number;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userAvatarDataUrl?: string | null;
  userDisplayName?: string | null;
  userEmail: string;
  userFirstName?: string | null;
  userId?: string;
  workspaceId?: string;
  userLastName?: string | null;
};

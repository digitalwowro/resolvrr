import type { AuthUserRole } from "@/auth/types";
import type {
  DeleteWorkspaceSavedViewAction,
  LoadWorkspaceSavedViewsSettingsAction,
  ReorderWorkspaceSavedViewsAction,
  SaveWorkspaceSavedViewAction,
  SavedViewSettingsData,
  SetDefaultWorkspaceSavedViewAction,
} from "@/features/saved-views/settings-model";
import type { WorkspaceSavedView } from "@/features/saved-views/workspace";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";
import type { LoadWorkspaceTicketListPageAction } from "@/features/tickets/list-page-action-result";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import type {
  LoadWorkspaceNotificationsAction,
  MarkWorkspaceNotificationsReadAction,
} from "@/features/notifications";
import type {
  SaveWorkspaceOpenTabsStateAction,
  WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { TicketListReadResult } from "@/features/tickets/read-model";
import type {
  ConnectionProviderOption,
  HelpdeskConnectionActionResult,
  HelpdeskConnectionFormAction,
} from "@/features/helpdesk-connections/service-types";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketDetail,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import type { WorkspaceMenuConnection } from "./workspace-header";

export type TicketWorkspaceProps = {
  columns: WorkspaceTicketColumn[];
  communicationCapabilities?: TicketCommunicationCapabilities;
  connections: WorkspaceMenuConnection[];
  connectionProviderOptions?: ConnectionProviderOption[];
  createConnectionAction?: HelpdeskConnectionFormAction;
  deleteSavedViewAction?: DeleteWorkspaceSavedViewAction;
  deleteConnectionAction?: HelpdeskConnectionFormAction;
  detail?: WorkspaceTicketDetail;
  detailResult?: WorkspaceTicketDetailLoadResult;
  disableConnectionAction?: HelpdeskConnectionFormAction;
  listResult: TicketListReadResult;
  loadTicketDetailAction?: LoadWorkspaceTicketDetailAction;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  loadSavedViewsSettingsAction?: LoadWorkspaceSavedViewsSettingsAction;
  loadWorkspaceNotificationsAction?: LoadWorkspaceNotificationsAction;
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  logoutAction(formData: FormData): void | Promise<void>;
  markWorkspaceNotificationsReadAction?: MarkWorkspaceNotificationsReadAction;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  rows: WorkspaceTicketRow[];
  savedViews?: WorkspaceSavedView[];
  initialSavedViewSettingsData?: SavedViewSettingsData;
  reorderSavedViewsAction?: ReorderWorkspaceSavedViewsAction;
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  saveSavedViewAction?: SaveWorkspaceSavedViewAction;
  selectedSavedViewId?: string;
  selectedTicketId?: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  setDefaultSavedViewAction?: SetDefaultWorkspaceSavedViewAction;
  tabs: WorkspaceTicketTab[];
  updateConnectionAction?: HelpdeskConnectionFormAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userEmail: string;
  userRole?: AuthUserRole;
  validateConnectionAction?: HelpdeskConnectionFormAction;
};

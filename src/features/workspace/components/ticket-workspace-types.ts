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
  LoadWorkspaceAiSettingsAction,
  LoadAiPromptCenterAction,
  ResetUserAiPromptOverrideAction,
  ResetWorkspaceAiPromptAction,
  SaveAiPromptOverridePolicyAction,
  SaveUserWorkspaceAiSettingsAction,
  SaveUserAiPromptOverrideAction,
  SaveWorkspaceAiSettingsAction,
  SaveWorkspaceAiPromptAction,
  SummarizeWorkspaceTicketAction,
  WorkspaceAiSettingsData,
} from "@/features/ai";
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
import type {
  ChangePasswordAction,
  UpdateAvatarAction,
  UpdateProfileAction,
} from "./workspace-settings-profile-section";

export type TicketWorkspaceProps = {
  changePasswordAction?: ChangePasswordAction;
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
  loadWorkspaceAiSettingsAction?: LoadWorkspaceAiSettingsAction;
  loadAiPromptCenterAction?: LoadAiPromptCenterAction;
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  summarizeTicketAction?: SummarizeWorkspaceTicketAction;
  initialAiSettingsData?: WorkspaceAiSettingsData;
  logoutAction(formData: FormData): void | Promise<void>;
  markWorkspaceNotificationsReadAction?: MarkWorkspaceNotificationsReadAction;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  rows: WorkspaceTicketRow[];
  savedViews?: WorkspaceSavedView[];
  initialSavedViewSettingsData?: SavedViewSettingsData;
  reorderSavedViewsAction?: ReorderWorkspaceSavedViewsAction;
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  resetUserAiPromptOverrideAction?: ResetUserAiPromptOverrideAction;
  resetWorkspaceAiPromptAction?: ResetWorkspaceAiPromptAction;
  saveAiPromptOverridePolicyAction?: SaveAiPromptOverridePolicyAction;
  saveUserWorkspaceAiSettingsAction?: SaveUserWorkspaceAiSettingsAction;
  saveUserAiPromptOverrideAction?: SaveUserAiPromptOverrideAction;
  saveWorkspaceAiSettingsAction?: SaveWorkspaceAiSettingsAction;
  saveWorkspaceAiPromptAction?: SaveWorkspaceAiPromptAction;
  saveSavedViewAction?: SaveWorkspaceSavedViewAction;
  selectedSavedViewId?: string;
  selectedTicketId?: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  setDefaultSavedViewAction?: SetDefaultWorkspaceSavedViewAction;
  tabs: WorkspaceTicketTab[];
  updateConnectionAction?: HelpdeskConnectionFormAction;
  updateAvatarAction?: UpdateAvatarAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  updateProfileAction?: UpdateProfileAction;
  userAvatarDataUrl?: string | null;
  userDisplayName?: string | null;
  userEmail: string;
  userFirstName?: string | null;
  userLastName?: string | null;
  userRole?: AuthUserRole;
  validateConnectionAction?: HelpdeskConnectionFormAction;
};

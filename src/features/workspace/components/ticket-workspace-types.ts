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
  AiRephraseStyleOption,
  DeleteWorkspaceAiRephraseStyleAction,
  LoadAiRephraseStylesAction,
  LoadWorkspaceAiSettingsAction,
  LoadMyStyleAction,
  LoadAiPromptCenterAction,
  MoveWorkspaceAiRephraseStyleAction,
  ResetMyStyleAction,
  ResetUserAiRephraseStyleOverrideAction,
  ResetWorkspaceAiPromptAction,
  SaveMyStyleAction,
  SaveUserWorkspaceAiSettingsAction,
  SaveUserAiRephraseStyleOverrideAction,
  SaveWorkspaceAiRephraseStyleAction,
  SaveWorkspaceAiSettingsAction,
  SaveWorkspaceAiPromptAction,
  SummarizeWorkspaceTicketAction,
  TicketAiSummaryResult,
  RewriteDraftAction,
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
  loadAiRephraseStylesAction?: LoadAiRephraseStylesAction;
  loadAiPromptCenterAction?: LoadAiPromptCenterAction;
  loadMyStyleAction?: LoadMyStyleAction;
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  rewriteDraftAction?: RewriteDraftAction;
  summarizeTicketAction?: SummarizeWorkspaceTicketAction;
  initialTicketAiSummary?: {
    result: Extract<TicketAiSummaryResult, { status: "available" }>;
    ticketId: string;
  };
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
  resetMyStyleAction?: ResetMyStyleAction;
  rephraseStyleOptions?: AiRephraseStyleOption[];
  resetUserAiRephraseStyleOverrideAction?: ResetUserAiRephraseStyleOverrideAction;
  resetWorkspaceAiPromptAction?: ResetWorkspaceAiPromptAction;
  saveMyStyleAction?: SaveMyStyleAction;
  deleteWorkspaceAiRephraseStyleAction?: DeleteWorkspaceAiRephraseStyleAction;
  moveWorkspaceAiRephraseStyleAction?: MoveWorkspaceAiRephraseStyleAction;
  saveUserWorkspaceAiSettingsAction?: SaveUserWorkspaceAiSettingsAction;
  saveUserAiRephraseStyleOverrideAction?: SaveUserAiRephraseStyleOverrideAction;
  saveWorkspaceAiRephraseStyleAction?: SaveWorkspaceAiRephraseStyleAction;
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
  userId?: string;
  userLastName?: string | null;
  userRole?: AuthUserRole;
  validateConnectionAction?: HelpdeskConnectionFormAction;
};

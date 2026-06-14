import type { AuthUser, AuthUserRole } from "@/auth/types";
import type {
  LoadAiPromptCenterAction,
  LoadMyStyleAction,
  LoadWorkspaceAiSettingsAction,
  ResetMyStyleAction,
  ResetUserAiPromptOverrideAction,
  ResetWorkspaceAiPromptAction,
  SaveAiPromptOverridePolicyAction,
  SaveMyStyleAction,
  SaveUserAiPromptOverrideAction,
  SaveUserWorkspaceAiSettingsAction,
  SaveWorkspaceAiPromptAction,
  SaveWorkspaceAiSettingsAction,
  WorkspaceAiSettingsData,
} from "@/features/ai";
import type {
  ConnectionProviderOption,
  HelpdeskConnectionFormAction,
  WorkspaceSettingsConnection,
} from "@/features/helpdesk-connections/service-types";
import type {
  DeleteWorkspaceSavedViewAction,
  LoadWorkspaceSavedViewsSettingsAction,
  ReorderWorkspaceSavedViewsAction,
  SavedViewSettingsData,
  SaveWorkspaceSavedViewAction,
  SetDefaultWorkspaceSavedViewAction,
} from "@/features/saved-views/settings-model";
import type {
  ChangePasswordAction,
  UpdateAvatarAction,
  UpdateProfileAction,
} from "./workspace-settings-profile-section";
import type { WorkspaceSettingsSection } from "./workspace-settings-types";

export type WorkspaceSettingsDialogProps = {
  changePasswordAction?: ChangePasswordAction;
  connections: WorkspaceSettingsConnection[];
  createConnectionAction?: HelpdeskConnectionFormAction;
  deleteConnectionAction?: HelpdeskConnectionFormAction;
  deleteSavedViewAction?: DeleteWorkspaceSavedViewAction;
  disableConnectionAction?: HelpdeskConnectionFormAction;
  initialAiSettingsData?: WorkspaceAiSettingsData;
  initialSection: WorkspaceSettingsSection;
  initialSavedViewData?: SavedViewSettingsData;
  loadAiPromptCenterAction?: LoadAiPromptCenterAction;
  loadMyStyleAction?: LoadMyStyleAction;
  loadSavedViewsSettingsAction?: LoadWorkspaceSavedViewsSettingsAction;
  loadWorkspaceAiSettingsAction?: LoadWorkspaceAiSettingsAction;
  onAiSettingsDataChange?(data: WorkspaceAiSettingsData): void;
  onClose(): void;
  onProfileUserChange?(user: AuthUser): void;
  onSavedViewDataChange?(data: SavedViewSettingsData): void;
  providerOptions: ConnectionProviderOption[];
  resetUserAiPromptOverrideAction?: ResetUserAiPromptOverrideAction;
  resetMyStyleAction?: ResetMyStyleAction;
  resetWorkspaceAiPromptAction?: ResetWorkspaceAiPromptAction;
  reorderSavedViewsAction?: ReorderWorkspaceSavedViewsAction;
  saveAiPromptOverridePolicyAction?: SaveAiPromptOverridePolicyAction;
  saveMyStyleAction?: SaveMyStyleAction;
  saveSavedViewAction?: SaveWorkspaceSavedViewAction;
  saveUserAiPromptOverrideAction?: SaveUserAiPromptOverrideAction;
  saveUserWorkspaceAiSettingsAction?: SaveUserWorkspaceAiSettingsAction;
  saveWorkspaceAiPromptAction?: SaveWorkspaceAiPromptAction;
  saveWorkspaceAiSettingsAction?: SaveWorkspaceAiSettingsAction;
  setActiveConnectionAction?: HelpdeskConnectionFormAction;
  setDefaultSavedViewAction?: SetDefaultWorkspaceSavedViewAction;
  updateAvatarAction?: UpdateAvatarAction;
  updateConnectionAction?: HelpdeskConnectionFormAction;
  updateProfileAction?: UpdateProfileAction;
  userAvatarDataUrl: string | null;
  userDisplayName: string | null;
  userEmail: string;
  userFirstName: string | null;
  userLastName: string | null;
  userRole: AuthUserRole;
  validateConnectionAction?: HelpdeskConnectionFormAction;
};

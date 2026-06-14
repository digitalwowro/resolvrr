import type { AuthUser, AuthUserRole } from "@/auth/types";
import type {
  AiRephraseStyleOption,
  DeleteWorkspaceAiRephraseStyleAction,
  LoadAiPromptCenterAction,
  LoadMyStyleAction,
  LoadWorkspaceAiSettingsAction,
  MoveWorkspaceAiRephraseStyleAction,
  ResetMyStyleAction,
  ResetUserAiRephraseStyleOverrideAction,
  ResetWorkspaceAiPromptAction,
  SaveMyStyleAction,
  SaveUserAiRephraseStyleOverrideAction,
  SaveUserWorkspaceAiSettingsAction,
  SaveWorkspaceAiRephraseStyleAction,
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
  deleteWorkspaceAiRephraseStyleAction?: DeleteWorkspaceAiRephraseStyleAction;
  disableConnectionAction?: HelpdeskConnectionFormAction;
  initialAiSettingsData?: WorkspaceAiSettingsData;
  initialSection: WorkspaceSettingsSection;
  initialSavedViewData?: SavedViewSettingsData;
  loadAiPromptCenterAction?: LoadAiPromptCenterAction;
  loadMyStyleAction?: LoadMyStyleAction;
  loadSavedViewsSettingsAction?: LoadWorkspaceSavedViewsSettingsAction;
  loadWorkspaceAiSettingsAction?: LoadWorkspaceAiSettingsAction;
  moveWorkspaceAiRephraseStyleAction?: MoveWorkspaceAiRephraseStyleAction;
  onAiSettingsDataChange?(data: WorkspaceAiSettingsData): void;
  onClose(): void;
  onProfileUserChange?(user: AuthUser): void;
  onRephraseStylesChange?(styles: AiRephraseStyleOption[]): void;
  onSavedViewDataChange?(data: SavedViewSettingsData): void;
  providerOptions: ConnectionProviderOption[];
  resetUserAiRephraseStyleOverrideAction?: ResetUserAiRephraseStyleOverrideAction;
  resetMyStyleAction?: ResetMyStyleAction;
  resetWorkspaceAiPromptAction?: ResetWorkspaceAiPromptAction;
  reorderSavedViewsAction?: ReorderWorkspaceSavedViewsAction;
  saveMyStyleAction?: SaveMyStyleAction;
  saveSavedViewAction?: SaveWorkspaceSavedViewAction;
  saveUserAiRephraseStyleOverrideAction?: SaveUserAiRephraseStyleOverrideAction;
  saveUserWorkspaceAiSettingsAction?: SaveUserWorkspaceAiSettingsAction;
  saveWorkspaceAiRephraseStyleAction?: SaveWorkspaceAiRephraseStyleAction;
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

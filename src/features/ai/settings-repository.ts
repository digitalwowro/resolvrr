import type {
  AiProviderProtocol,
  WorkspaceAiUserPermissions,
  WorkspaceAiPolicy,
} from "./settings-model";

export type StoredAiProviderConfig = {
  baseUrl: string;
  encryptedApiKey: string;
  keyVersion: string;
  model: string;
  providerProtocol: AiProviderProtocol;
};

export type StoredWorkspaceAiSetting = {
  config: StoredAiProviderConfig | null;
  helpdeskConnectionId: string;
  policy: WorkspaceAiPolicy;
  userPermissions: WorkspaceAiUserPermissions;
};

export type UpsertWorkspaceAiSettingInput = {
  config?: StoredAiProviderConfig | null;
  helpdeskConnectionId: string;
  policy: WorkspaceAiPolicy;
  userPermissions: WorkspaceAiUserPermissions;
};

export type UpsertUserWorkspaceAiSettingInput = StoredAiProviderConfig & {
  helpdeskConnectionId: string;
  userId: string;
};

export type AiSettingsRepository = {
  deleteUserSettingsForWorkspace(helpdeskConnectionId: string): Promise<void>;
  getUserSetting(
    userId: string,
    helpdeskConnectionId: string,
  ): Promise<StoredAiProviderConfig | null>;
  getWorkspaceSetting(
    helpdeskConnectionId: string,
  ): Promise<StoredWorkspaceAiSetting | null>;
  upsertUserSetting(input: UpsertUserWorkspaceAiSettingInput): Promise<void>;
  upsertWorkspaceSetting(input: UpsertWorkspaceAiSettingInput): Promise<void>;
};

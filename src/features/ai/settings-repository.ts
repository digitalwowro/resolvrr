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
  workspaceId: string;
  policy: WorkspaceAiPolicy;
  userPermissions: WorkspaceAiUserPermissions;
};

export type UpsertWorkspaceAiSettingInput = {
  config?: StoredAiProviderConfig | null;
  workspaceId: string;
  policy: WorkspaceAiPolicy;
  userPermissions: WorkspaceAiUserPermissions;
};

export type UpsertUserWorkspaceAiSettingInput = StoredAiProviderConfig & {
  workspaceId: string;
  userId: string;
};

export type AiSettingsRepository = {
  deleteUserSettingsForWorkspace(workspaceId: string): Promise<void>;
  getUserSetting(
    userId: string,
    workspaceId: string,
  ): Promise<StoredAiProviderConfig | null>;
  getWorkspaceSetting(
    workspaceId: string,
  ): Promise<StoredWorkspaceAiSetting | null>;
  upsertUserSetting(input: UpsertUserWorkspaceAiSettingInput): Promise<void>;
  upsertWorkspaceSetting(input: UpsertWorkspaceAiSettingInput): Promise<void>;
};

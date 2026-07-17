import type { AiRuntimeConfig } from "./provider-config";

export type AiProviderProtocol = Extract<
  AiRuntimeConfig,
  { status: "available" }
>["provider"];

export type WorkspaceAiPolicy =
  | "admin-managed"
  | "disabled"
  | "user-provided";

export type AiSettingsConfigView = {
  baseUrl: string;
  hasApiKey: boolean;
  model: string;
  providerProtocol: AiProviderProtocol;
};

export type WorkspaceAiUserPermissions = {
  canEditAiRephraseStyleOverrides: boolean;
  canEditMyStyle: boolean;
};

export type WorkspaceAiSettingsData = {
  activeWorkspace: { id: string; label: string } | null;
  canManageWorkspace: boolean;
  canViewPromptCenter: boolean;
  policy: WorkspaceAiPolicy;
  userConfig: AiSettingsConfigView | null;
  userPermissions: WorkspaceAiUserPermissions;
  workspaceConfig: AiSettingsConfigView | null;
  workspaceConfigConfigured: boolean;
};

export type WorkspaceAiSettingsActionCode =
  | "ai-settings-saved"
  | "ai-user-settings-saved"
  | "invalid-ai-base-url"
  | "invalid-ai-config"
  | "invalid-ai-input"
  | "missing-ai-config"
  | "no-active-workspace"
  | "not-admin"
  | "provider-auth-failed"
  | "provider-rate-limited"
  | "provider-request-rejected"
  | "provider-temporary-failure"
  | "user-ai-not-required";

export type WorkspaceAiSettingsActionResult = {
  code: WorkspaceAiSettingsActionCode;
  data: WorkspaceAiSettingsData;
  ok: boolean;
};

export type LoadWorkspaceAiSettingsAction =
  () => Promise<WorkspaceAiSettingsData>;

export type SaveWorkspaceAiSettingsAction =
  (formData: FormData) => Promise<WorkspaceAiSettingsActionResult>;

export type SaveUserWorkspaceAiSettingsAction =
  (formData: FormData) => Promise<WorkspaceAiSettingsActionResult>;

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

export type WorkspaceAiSettingsData = {
  activeWorkspace: { id: string; label: string } | null;
  canManageWorkspace: boolean;
  policy: WorkspaceAiPolicy;
  userConfig: AiSettingsConfigView | null;
  workspaceConfig: AiSettingsConfigView | null;
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

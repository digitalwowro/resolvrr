import { createHmac } from "node:crypto";
import type { AuthUser } from "@/auth/types";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { AiRuntimeConfig } from "./provider-config";
import type { ParsedAiSettingsConfigInput } from "./settings-form";
import { validateAiProviderConfig } from "./settings-live-validation";
import type {
  AiSettingsRepository,
  StoredAiProviderConfig,
} from "./settings-repository";
import type {
  WorkspaceAiUserPermissions,
  WorkspaceAiSettingsActionCode,
  WorkspaceAiSettingsActionResult,
  WorkspaceAiSettingsData,
} from "./settings-model";

export const secretKeyVersion = "v1";

export const defaultWorkspaceAiUserPermissions: WorkspaceAiUserPermissions = {
  canEditAiRephraseStyleOverrides: false,
  canEditMyStyle: false,
};

export type ActiveWorkspace = {
  access: {
    canEditAiRephraseStyleOverrides: boolean;
    canEditMyStyle: boolean;
    role: "ADMIN" | "AGENT";
  };
  id: string;
  label: string;
};

export async function activeWorkspace(
  repository: HelpdeskConnectionsRepository,
  userId: string,
): Promise<ActiveWorkspace | null> {
  const activeWorkspaceId = await repository.getActiveWorkspaceId(userId);
  if (!activeWorkspaceId) {
    return null;
  }

  const workspace = await repository.findWorkspaceForUser(userId, activeWorkspaceId);
  return workspace
    ? { access: workspace.access, id: workspace.id, label: workspace.displayName }
    : null;
}

function configView(config: StoredAiProviderConfig | null) {
  return config
    ? {
        baseUrl: config.baseUrl,
        hasApiKey: true,
        model: config.model,
        providerProtocol: config.providerProtocol,
      }
    : null;
}

export async function settingsDataForWorkspace(
  repository: AiSettingsRepository,
  user: AuthUser,
  workspace: ActiveWorkspace | null,
): Promise<WorkspaceAiSettingsData> {
  if (!workspace) {
    return {
      activeWorkspace: null,
      canManageWorkspace: user.role === "ADMIN",
      canViewPromptCenter: false,
      policy: "disabled",
      userConfig: null,
      userPermissions: defaultWorkspaceAiUserPermissions,
      workspaceConfig: null,
      workspaceConfigConfigured: false,
    };
  }

  const [workspaceSetting, userConfig] = await Promise.all([
    repository.getWorkspaceSetting(workspace.id),
    repository.getUserSetting(user.id, workspace.id),
  ]);

  return {
    activeWorkspace: workspace,
    canManageWorkspace: user.role === "ADMIN" || workspace.access.role === "ADMIN",
    canViewPromptCenter:
      (workspaceSetting?.policy ?? "disabled") !== "disabled" &&
      (user.role === "ADMIN" ||
        workspace.access.role === "ADMIN" ||
        workspace.access.canEditAiRephraseStyleOverrides),
    policy: workspaceSetting?.policy ?? "disabled",
    userConfig: configView(userConfig),
    userPermissions:
      workspaceSetting?.userPermissions ?? defaultWorkspaceAiUserPermissions,
    workspaceConfig:
      user.role === "ADMIN"
        ? configView(workspaceSetting?.config ?? null)
        : null,
    workspaceConfigConfigured: Boolean(workspaceSetting?.config),
  };
}

export async function loadWorkspaceAiSettings(
  repository: AiSettingsRepository,
  connectionRepository: HelpdeskConnectionsRepository,
  user: AuthUser,
): Promise<WorkspaceAiSettingsData> {
  return settingsDataForWorkspace(
    repository,
    user,
    await activeWorkspace(connectionRepository, user.id),
  );
}

function runtimeConfigFromStored(
  config: StoredAiProviderConfig,
  encryptionKey: string,
): AiRuntimeConfig {
  try {
    return {
      status: "available",
      apiKey: decryptSecret(config.encryptedApiKey, encryptionKey),
      baseUrl: config.baseUrl,
      configurationVersion: createHmac("sha256", encryptionKey)
        .update(JSON.stringify([
          "resolvrr:ai-config:v1",
          config.providerProtocol,
          config.baseUrl,
          config.model,
          config.encryptedApiKey,
        ]))
        .digest("hex")
        .slice(0, 16),
      model: config.model,
      provider: config.providerProtocol,
    };
  } catch {
    return { status: "unconfigured", reason: "invalid-ai-config" };
  }
}

export async function resolveWorkspaceAiRuntimeConfig(
  repository: AiSettingsRepository,
  encryptionKey: string,
  userId: string,
  workspaceId: string,
): Promise<AiRuntimeConfig> {
  const workspaceSetting =
    await repository.getWorkspaceSetting(workspaceId);
  if (!workspaceSetting || workspaceSetting.policy === "disabled") {
    return { status: "unconfigured", reason: "ai-disabled" };
  }

  if (workspaceSetting.policy === "admin-managed") {
    return workspaceSetting.config
      ? runtimeConfigFromStored(workspaceSetting.config, encryptionKey)
      : { status: "unconfigured", reason: "missing-workspace-ai-config" };
  }

  const userConfig = await repository.getUserSetting(userId, workspaceId);
  return userConfig
    ? runtimeConfigFromStored(userConfig, encryptionKey)
    : { status: "unconfigured", reason: "missing-user-ai-config" };
}

export function actionResult(
  code: WorkspaceAiSettingsActionCode,
  data: WorkspaceAiSettingsData,
  ok: boolean,
): WorkspaceAiSettingsActionResult {
  return { code, data, ok };
}

function storedConfigFromInput(
  input: ParsedAiSettingsConfigInput,
  encryptedApiKey: string,
): StoredAiProviderConfig {
  return {
    baseUrl: input.baseUrl,
    encryptedApiKey,
    keyVersion: secretKeyVersion,
    model: input.model,
    providerProtocol: input.providerProtocol,
  };
}

export async function validatedConfig(
  input: ParsedAiSettingsConfigInput,
  existingConfig: StoredAiProviderConfig | null,
  encryptionKey: string,
): Promise<StoredAiProviderConfig | WorkspaceAiSettingsActionCode> {
  let apiKey = input.apiKey;
  if (!apiKey && existingConfig) {
    try {
      apiKey = decryptSecret(existingConfig.encryptedApiKey, encryptionKey);
    } catch {
      return "invalid-ai-config";
    }
  }
  if (!apiKey) {
    return "missing-ai-config";
  }

  const runtimeConfig = {
    status: "available",
    apiKey,
    baseUrl: input.baseUrl,
    model: input.model,
    provider: input.providerProtocol,
  } satisfies Extract<AiRuntimeConfig, { status: "available" }>;
  const validationFailure = await validateAiProviderConfig(runtimeConfig);
  if (validationFailure) {
    return validationFailure;
  }

  return storedConfigFromInput(
    input,
    input.apiKey
      ? encryptSecret(input.apiKey, encryptionKey)
      : existingConfig?.encryptedApiKey ?? "",
  );
}

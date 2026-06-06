import type { AuthUser } from "@/auth/types";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  invalidateAiSummaryConnectionCache,
  invalidateAiSummaryWorkspaceCache,
} from "./summary-cache-invalidation";
import type { AiSummaryCacheRepository } from "./summary-cache-repository";
import { configInputFromForm, policyFromForm } from "./settings-form";
import type { AiSettingsRepository } from "./settings-repository";
import type {
  WorkspaceAiPolicy,
  WorkspaceAiSettingsActionResult,
} from "./settings-model";
import {
  actionResult,
  activeWorkspace,
  settingsDataForWorkspace,
  validatedConfig,
} from "./settings-service";

type SaveAiSettingsInput = {
  aiSummaryCacheRepository: AiSummaryCacheRepository;
  connectionRepository: HelpdeskConnectionsRepository;
  encryptionKey: string;
  formData: FormData;
  repository: AiSettingsRepository;
  user: AuthUser;
};

const policies = new Set<string>([
  "admin-managed",
  "disabled",
  "user-provided",
]);

function isWorkspaceAiPolicy(value: string): value is WorkspaceAiPolicy {
  return policies.has(value);
}

export async function saveWorkspaceAiSettings(
  input: SaveAiSettingsInput,
): Promise<WorkspaceAiSettingsActionResult> {
  const workspace = await activeWorkspace(input.connectionRepository, input.user.id);
  const currentData = await settingsDataForWorkspace(
    input.repository,
    input.user,
    workspace,
  );
  if (!workspace) {
    return actionResult("no-active-workspace", currentData, false);
  }
  if (input.user.role !== "ADMIN") {
    return actionResult("not-admin", currentData, false);
  }

  const policy = policyFromForm(input.formData);
  if (!isWorkspaceAiPolicy(policy)) {
    return actionResult("invalid-ai-input", currentData, false);
  }

  if (policy !== "admin-managed") {
    await input.repository.upsertWorkspaceSetting({
      config: null,
      helpdeskConnectionId: workspace.id,
      policy,
    });
    if (policy === "disabled") {
      await input.repository.deleteUserSettingsForWorkspace(workspace.id);
    }
    await invalidateAiSummaryWorkspaceCache({
      cacheRepository: input.aiSummaryCacheRepository,
      helpdeskConnectionId: workspace.id,
    });
    return actionResult(
      "ai-settings-saved",
      await settingsDataForWorkspace(input.repository, input.user, workspace),
      true,
    );
  }

  const parsedConfig = await configInputFromForm(input.formData);
  if (typeof parsedConfig === "string") {
    return actionResult(parsedConfig, currentData, false);
  }
  const existingSetting = await input.repository.getWorkspaceSetting(workspace.id);
  const config = await validatedConfig(
    parsedConfig,
    existingSetting?.config ?? null,
    input.encryptionKey,
  );
  if (typeof config === "string") {
    return actionResult(config, currentData, false);
  }

  await input.repository.upsertWorkspaceSetting({
    config,
    helpdeskConnectionId: workspace.id,
    policy,
  });
  await input.repository.deleteUserSettingsForWorkspace(workspace.id);
  await invalidateAiSummaryWorkspaceCache({
    cacheRepository: input.aiSummaryCacheRepository,
    helpdeskConnectionId: workspace.id,
  });
  return actionResult(
    "ai-settings-saved",
    await settingsDataForWorkspace(input.repository, input.user, workspace),
    true,
  );
}

export async function saveUserWorkspaceAiSettings(
  input: SaveAiSettingsInput,
): Promise<WorkspaceAiSettingsActionResult> {
  const workspace = await activeWorkspace(input.connectionRepository, input.user.id);
  const currentData = await settingsDataForWorkspace(
    input.repository,
    input.user,
    workspace,
  );
  if (!workspace) {
    return actionResult("no-active-workspace", currentData, false);
  }
  if (currentData.policy !== "user-provided") {
    return actionResult("user-ai-not-required", currentData, false);
  }

  const parsedConfig = await configInputFromForm(input.formData);
  if (typeof parsedConfig === "string") {
    return actionResult(parsedConfig, currentData, false);
  }
  const config = await validatedConfig(
    parsedConfig,
    await input.repository.getUserSetting(input.user.id, workspace.id),
    input.encryptionKey,
  );
  if (typeof config === "string") {
    return actionResult(config, currentData, false);
  }

  await input.repository.upsertUserSetting({
    ...config,
    helpdeskConnectionId: workspace.id,
    userId: input.user.id,
  });
  await invalidateAiSummaryConnectionCache({
    cacheRepository: input.aiSummaryCacheRepository,
    helpdeskConnectionId: workspace.id,
    userId: input.user.id,
  });
  return actionResult(
    "ai-user-settings-saved",
    await settingsDataForWorkspace(input.repository, input.user, workspace),
    true,
  );
}

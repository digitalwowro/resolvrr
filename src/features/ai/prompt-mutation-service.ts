import type { AuthUser } from "@/auth/types";
import { encryptSecret } from "@/security/encryption";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  invalidateAiSummaryConnectionCache,
  invalidateAiSummaryWorkspaceCache,
} from "./summary-cache-invalidation";
import type { AiSummaryCacheRepository } from "./summary-cache-repository";
import type { AiPromptRepository } from "./prompt-repository";
import {
  findAiPromptDefinition,
  type AiPromptDefinition,
} from "./prompt-registry";
import type { AiSettingsRepository } from "./settings-repository";
import {
  activeWorkspace,
} from "./settings-service";
import {
  promptCenterDataForWorkspace,
} from "./prompt-service";
import type {
  AiPromptActionCode,
  AiPromptActionResult,
} from "./prompt-model";

type PromptMutationInput = {
  aiSummaryCacheRepository: AiSummaryCacheRepository;
  connectionRepository: HelpdeskConnectionsRepository;
  encryptionKey: string;
  formData?: FormData;
  promptKey?: string;
  promptRepository: AiPromptRepository;
  settingsRepository: AiSettingsRepository;
  user: AuthUser;
};

const promptSecretKeyVersion = "v1";

function actionResult(
  code: AiPromptActionCode,
  data: Awaited<ReturnType<typeof promptCenterDataForWorkspace>>,
  ok: boolean,
): AiPromptActionResult {
  return { code, data, ok };
}

function promptKeyFromForm(formData: FormData | undefined) {
  const value = formData?.get("promptKey");
  return typeof value === "string" ? value : "";
}

function promptFromForm(formData: FormData | undefined) {
  const value = formData?.get("prompt");
  return typeof value === "string" ? value.trim() : "";
}

function allowUserPromptOverridesFromForm(formData: FormData | undefined) {
  return formData?.get("allowUserPromptOverrides") === "on";
}

function validatePrompt(
  definition: AiPromptDefinition,
  prompt: string,
): AiPromptActionCode | null {
  if (!prompt || prompt.length > definition.maxLength) {
    return "invalid-ai-prompt";
  }
  return null;
}

async function mutationContext(input: PromptMutationInput) {
  const workspace = await activeWorkspace(
    input.connectionRepository,
    input.user.id,
  );
  const data = await promptCenterDataForWorkspace({
    encryptionKey: input.encryptionKey,
    promptRepository: input.promptRepository,
    settingsRepository: input.settingsRepository,
    user: input.user,
    workspace,
  });
  return { data, workspace };
}

async function refreshedData(
  input: PromptMutationInput,
  workspace: NonNullable<Awaited<ReturnType<typeof activeWorkspace>>>,
) {
  return promptCenterDataForWorkspace({
    encryptionKey: input.encryptionKey,
    promptRepository: input.promptRepository,
    settingsRepository: input.settingsRepository,
    user: input.user,
    workspace,
  });
}

export async function saveWorkspaceAiPrompt(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (input.user.role !== "ADMIN") {
    return actionResult("not-admin", data, false);
  }
  if (data.policy === "disabled") {
    return actionResult("ai-disabled", data, false);
  }

  const definition = findAiPromptDefinition(promptKeyFromForm(input.formData));
  if (!definition?.adminEditable) {
    return actionResult("invalid-ai-prompt-input", data, false);
  }
  const prompt = promptFromForm(input.formData);
  const validation = validatePrompt(definition, prompt);
  if (validation) {
    return actionResult(validation, data, false);
  }

  await input.promptRepository.upsertWorkspacePrompt({
    encryptedPrompt: encryptSecret(prompt, input.encryptionKey),
    helpdeskConnectionId: workspace.id,
    keyVersion: promptSecretKeyVersion,
    promptKey: definition.key,
  });
  await invalidateAiSummaryWorkspaceCache({
    cacheRepository: input.aiSummaryCacheRepository,
    helpdeskConnectionId: workspace.id,
  });
  return actionResult(
    "ai-prompt-saved",
    await refreshedData(input, workspace),
    true,
  );
}

export async function resetWorkspaceAiPrompt(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (input.user.role !== "ADMIN") {
    return actionResult("not-admin", data, false);
  }
  if (data.policy === "disabled") {
    return actionResult("ai-disabled", data, false);
  }

  const definition = findAiPromptDefinition(input.promptKey ?? "");
  if (!definition?.adminEditable) {
    return actionResult("invalid-ai-prompt-input", data, false);
  }

  await input.promptRepository.deleteWorkspacePrompt({
    helpdeskConnectionId: workspace.id,
    promptKey: definition.key,
  });
  await invalidateAiSummaryWorkspaceCache({
    cacheRepository: input.aiSummaryCacheRepository,
    helpdeskConnectionId: workspace.id,
  });
  return actionResult(
    "ai-prompt-reset",
    await refreshedData(input, workspace),
    true,
  );
}

export async function saveAiPromptOverridePolicy(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (input.user.role !== "ADMIN") {
    return actionResult("not-admin", data, false);
  }
  if (data.policy === "disabled") {
    return actionResult("ai-disabled", data, false);
  }

  const currentSetting =
    await input.settingsRepository.getWorkspaceSetting(workspace.id);
  await input.settingsRepository.upsertWorkspaceSetting({
    allowUserPromptOverrides: allowUserPromptOverridesFromForm(input.formData),
    config: currentSetting?.config ?? null,
    helpdeskConnectionId: workspace.id,
    policy: currentSetting?.policy ?? data.policy,
  });
  await invalidateAiSummaryWorkspaceCache({
    cacheRepository: input.aiSummaryCacheRepository,
    helpdeskConnectionId: workspace.id,
  });
  return actionResult(
    "ai-prompt-policy-saved",
    await refreshedData(input, workspace),
    true,
  );
}

export async function saveUserAiPromptOverride(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (!data.allowUserPromptOverrides) {
    return actionResult("prompt-not-user-editable", data, false);
  }

  const definition = findAiPromptDefinition(promptKeyFromForm(input.formData));
  if (!definition?.userOverridable) {
    return actionResult("prompt-not-user-editable", data, false);
  }
  const prompt = promptFromForm(input.formData);
  const validation = validatePrompt(definition, prompt);
  if (validation) {
    return actionResult(validation, data, false);
  }

  await input.promptRepository.upsertUserPromptOverride({
    encryptedPrompt: encryptSecret(prompt, input.encryptionKey),
    helpdeskConnectionId: workspace.id,
    keyVersion: promptSecretKeyVersion,
    promptKey: definition.key,
    userId: input.user.id,
  });
  await invalidateAiSummaryConnectionCache({
    cacheRepository: input.aiSummaryCacheRepository,
    helpdeskConnectionId: workspace.id,
    userId: input.user.id,
  });
  return actionResult(
    "ai-user-prompt-saved",
    await refreshedData(input, workspace),
    true,
  );
}

export async function resetUserAiPromptOverride(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (!data.allowUserPromptOverrides) {
    return actionResult("prompt-not-user-editable", data, false);
  }

  const definition = findAiPromptDefinition(input.promptKey ?? "");
  if (!definition?.userOverridable) {
    return actionResult("prompt-not-user-editable", data, false);
  }

  await input.promptRepository.deleteUserPromptOverride({
    helpdeskConnectionId: workspace.id,
    promptKey: definition.key,
    userId: input.user.id,
  });
  await invalidateAiSummaryConnectionCache({
    cacheRepository: input.aiSummaryCacheRepository,
    helpdeskConnectionId: workspace.id,
    userId: input.user.id,
  });
  return actionResult(
    "ai-user-prompt-reset",
    await refreshedData(input, workspace),
    true,
  );
}

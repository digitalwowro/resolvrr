import { encryptSecret } from "@/security/encryption";
import { invalidateAiSummaryWorkspaceCache } from "./summary-cache-invalidation";
import {
  findAiPromptDefinition,
  type AiPromptDefinition,
} from "./prompt-registry";
import {
  actionResult,
  mutationContext,
  refreshedData,
  type PromptMutationInput,
} from "./prompt-mutation-context";
import type { AiPromptActionCode, AiPromptActionResult } from "./prompt-model";
import { canManageWorkspaceAi } from "./rephrase-style-service";

export {
  deleteWorkspaceAiRephraseStyle,
  moveWorkspaceAiRephraseStyle,
  resetUserAiRephraseStyleOverride,
  saveUserAiRephraseStyleOverride,
  saveWorkspaceAiRephraseStyle,
} from "./rephrase-style-mutation-service";

const promptSecretKeyVersion = "v1";

function promptKeyFromForm(formData: FormData | undefined) {
  const value = formData?.get("promptKey");
  return typeof value === "string" ? value : "";
}

function promptFromForm(formData: FormData | undefined) {
  const value = formData?.get("prompt");
  return typeof value === "string" ? value.trim() : "";
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

export async function saveWorkspaceAiPrompt(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (!canManageWorkspaceAi(input.user, workspace)) {
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
    workspaceId: workspace.id,
    keyVersion: promptSecretKeyVersion,
    promptKey: definition.key,
  });
  await invalidateAiSummaryWorkspaceCache({
    cacheRepository: input.aiSummaryCacheRepository,
    workspaceId: workspace.id,
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
  if (!canManageWorkspaceAi(input.user, workspace)) {
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
    workspaceId: workspace.id,
    promptKey: definition.key,
  });
  await invalidateAiSummaryWorkspaceCache({
    cacheRepository: input.aiSummaryCacheRepository,
    workspaceId: workspace.id,
  });
  return actionResult(
    "ai-prompt-reset",
    await refreshedData(input, workspace),
    true,
  );
}

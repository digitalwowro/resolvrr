import type { AiPromptActionResult } from "./prompt-model";
import {
  actionResult,
  mutationContext,
  refreshedData,
  type PromptMutationInput,
} from "./prompt-mutation-context";
import {
  aiRephraseStyleKeyVersion,
  canManageWorkspaceAi,
  encryptedStylePrompt,
  normalizedStyleLabel,
  normalizedStylePrompt,
  validStyleLabel,
  validStylePrompt,
} from "./rephrase-style-service";

function styleIdFromForm(formData: FormData | undefined) {
  const value = formData?.get("styleId");
  return typeof value === "string" ? value : "";
}

function styleEnabledFromForm(formData: FormData | undefined) {
  return formData?.get("isEnabled") === "on";
}

export async function saveWorkspaceAiRephraseStyle(
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

  const label = normalizedStyleLabel(input.formData?.get("label") ?? null);
  const prompt = normalizedStylePrompt(input.formData?.get("prompt") ?? null);
  if (!validStyleLabel(label) || !validStylePrompt(prompt)) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }

  const styleId = styleIdFromForm(input.formData);
  if (!styleId) {
    const styles = await input.rephraseStyleRepository.listWorkspaceStyles(
      workspace.id,
    );
    await input.rephraseStyleRepository.createWorkspaceStyle({
      encryptedPrompt: encryptedStylePrompt(prompt, input.encryptionKey),
      workspaceId: workspace.id,
      keyVersion: aiRephraseStyleKeyVersion,
      label,
      sortOrder: Math.max(0, ...styles.map((style) => style.sortOrder)) + 10,
    });
    return actionResult(
      "ai-rephrase-style-created",
      await refreshedData(input, workspace),
      true,
    );
  }

  const saved = await input.rephraseStyleRepository.updateWorkspaceStyle({
    encryptedPrompt: encryptedStylePrompt(prompt, input.encryptionKey),
    workspaceId: workspace.id,
    isEnabled: styleEnabledFromForm(input.formData),
    keyVersion: aiRephraseStyleKeyVersion,
    label,
    styleId,
  });
  if (!saved) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }
  return actionResult(
    "ai-rephrase-style-saved",
    await refreshedData(input, workspace),
    true,
  );
}

export async function deleteWorkspaceAiRephraseStyle(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (!canManageWorkspaceAi(input.user, workspace)) {
    return actionResult("not-admin", data, false);
  }
  if (!input.styleId) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }
  await input.rephraseStyleRepository.deleteWorkspaceStyle({
    workspaceId: workspace.id,
    styleId: input.styleId,
  });
  return actionResult(
    "ai-rephrase-style-deleted",
    await refreshedData(input, workspace),
    true,
  );
}

export async function moveWorkspaceAiRephraseStyle(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (!canManageWorkspaceAi(input.user, workspace)) {
    return actionResult("not-admin", data, false);
  }
  if (!input.styleId || !input.direction) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }

  const styles = await input.rephraseStyleRepository.listWorkspaceStyles(
    workspace.id,
  );
  const currentIndex = styles.findIndex((style) => style.id === input.styleId);
  const nextIndex =
    input.direction === "up" ? currentIndex - 1 : currentIndex + 1;
  if (currentIndex < 0 || nextIndex < 0 || nextIndex >= styles.length) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }

  const orderedStyleIds = styles.map((style) => style.id);
  [orderedStyleIds[currentIndex], orderedStyleIds[nextIndex]] = [
    orderedStyleIds[nextIndex],
    orderedStyleIds[currentIndex],
  ];
  await input.rephraseStyleRepository.updateWorkspaceStyleOrder({
    workspaceId: workspace.id,
    orderedStyleIds,
  });
  return actionResult(
    "ai-rephrase-style-moved",
    await refreshedData(input, workspace),
    true,
  );
}

export async function saveUserAiRephraseStyleOverride(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (!workspace.access.canEditAiRephraseStyleOverrides) {
    return actionResult("style-not-user-editable", data, false);
  }
  const styleId = styleIdFromForm(input.formData);
  const prompt = normalizedStylePrompt(input.formData?.get("prompt") ?? null);
  if (!styleId || !validStylePrompt(prompt)) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }
  const style = await input.rephraseStyleRepository.getWorkspaceStyle({
    workspaceId: workspace.id,
    styleId,
  });
  if (!style?.isEnabled) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }

  await input.rephraseStyleRepository.upsertUserStyleOverride({
    encryptedPrompt: encryptedStylePrompt(prompt, input.encryptionKey),
    workspaceId: workspace.id,
    keyVersion: aiRephraseStyleKeyVersion,
    styleId,
    userId: input.user.id,
  });
  return actionResult(
    "ai-rephrase-style-override-saved",
    await refreshedData(input, workspace),
    true,
  );
}

export async function resetUserAiRephraseStyleOverride(
  input: PromptMutationInput,
): Promise<AiPromptActionResult> {
  const { data, workspace } = await mutationContext(input);
  if (!workspace) {
    return actionResult("no-active-workspace", data, false);
  }
  if (!workspace.access.canEditAiRephraseStyleOverrides) {
    return actionResult("style-not-user-editable", data, false);
  }
  if (!input.styleId) {
    return actionResult("invalid-ai-rephrase-style", data, false);
  }

  await input.rephraseStyleRepository.deleteUserStyleOverride({
    workspaceId: workspace.id,
    styleId: input.styleId,
    userId: input.user.id,
  });
  return actionResult(
    "ai-rephrase-style-override-reset",
    await refreshedData(input, workspace),
    true,
  );
}

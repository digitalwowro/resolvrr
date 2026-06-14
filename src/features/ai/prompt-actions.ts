"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiPromptRepository } from "@/data/ai-prompts-repository";
import { prismaAiRephraseStyleRepository } from "@/data/ai-rephrase-styles-repository";
import { prismaAiSettingsRepository } from "@/data/ai-settings-repository";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import type { AiPromptKey } from "./prompt-registry";
import { loadAiPromptCenter } from "./prompt-service";
import { loadAiRephraseStyles } from "./rephrase-style-service";
import {
  deleteWorkspaceAiRephraseStyle,
  moveWorkspaceAiRephraseStyle,
  resetUserAiRephraseStyleOverride,
  resetWorkspaceAiPrompt,
  saveUserAiRephraseStyleOverride,
  saveWorkspaceAiRephraseStyle,
  saveWorkspaceAiPrompt,
} from "./prompt-mutation-service";

function promptMutationInput(formData?: FormData, promptKey?: string) {
  return {
    aiSummaryCacheRepository: prismaAiSummaryCacheRepository,
    connectionRepository: prismaHelpdeskConnectionsRepository,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    formData,
    promptKey,
    promptRepository: prismaAiPromptRepository,
    rephraseStyleRepository: prismaAiRephraseStyleRepository,
    settingsRepository: prismaAiSettingsRepository,
  };
}

export async function loadAiPromptCenterAction() {
  return loadAiPromptCenter({
    connectionRepository: prismaHelpdeskConnectionsRepository,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    promptRepository: prismaAiPromptRepository,
    rephraseStyleRepository: prismaAiRephraseStyleRepository,
    settingsRepository: prismaAiSettingsRepository,
    user: await requireCurrentUser(),
  });
}

export async function loadAiRephraseStylesAction() {
  const user = await requireCurrentUser();
  return loadAiRephraseStyles({
    connectionRepository: prismaHelpdeskConnectionsRepository,
    styleRepository: prismaAiRephraseStyleRepository,
    userId: user.id,
  });
}

export async function saveWorkspaceAiPromptAction(formData: FormData) {
  return saveWorkspaceAiPrompt({
    ...promptMutationInput(formData),
    user: await requireCurrentUser(),
  });
}

export async function resetWorkspaceAiPromptAction(promptKey: AiPromptKey) {
  return resetWorkspaceAiPrompt({
    ...promptMutationInput(undefined, promptKey),
    user: await requireCurrentUser(),
  });
}

export async function saveWorkspaceAiRephraseStyleAction(formData: FormData) {
  return saveWorkspaceAiRephraseStyle({
    ...promptMutationInput(formData),
    user: await requireCurrentUser(),
  });
}

export async function deleteWorkspaceAiRephraseStyleAction(styleId: string) {
  return deleteWorkspaceAiRephraseStyle({
    ...promptMutationInput(),
    styleId,
    user: await requireCurrentUser(),
  });
}

export async function moveWorkspaceAiRephraseStyleAction(
  styleId: string,
  direction: "down" | "up",
) {
  return moveWorkspaceAiRephraseStyle({
    ...promptMutationInput(),
    direction,
    styleId,
    user: await requireCurrentUser(),
  });
}

export async function saveUserAiRephraseStyleOverrideAction(formData: FormData) {
  return saveUserAiRephraseStyleOverride({
    ...promptMutationInput(formData),
    user: await requireCurrentUser(),
  });
}

export async function resetUserAiRephraseStyleOverrideAction(styleId: string) {
  return resetUserAiRephraseStyleOverride({
    ...promptMutationInput(),
    styleId,
    user: await requireCurrentUser(),
  });
}

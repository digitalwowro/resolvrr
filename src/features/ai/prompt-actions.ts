"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiPromptRepository } from "@/data/ai-prompts-repository";
import { prismaAiSettingsRepository } from "@/data/ai-settings-repository";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import type { AiPromptKey } from "./prompt-registry";
import { loadAiPromptCenter } from "./prompt-service";
import {
  resetUserAiPromptOverride,
  resetWorkspaceAiPrompt,
  saveAiPromptOverridePolicy,
  saveUserAiPromptOverride,
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
    settingsRepository: prismaAiSettingsRepository,
  };
}

export async function loadAiPromptCenterAction() {
  return loadAiPromptCenter({
    connectionRepository: prismaHelpdeskConnectionsRepository,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    promptRepository: prismaAiPromptRepository,
    settingsRepository: prismaAiSettingsRepository,
    user: await requireCurrentUser(),
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

export async function saveUserAiPromptOverrideAction(formData: FormData) {
  return saveUserAiPromptOverride({
    ...promptMutationInput(formData),
    user: await requireCurrentUser(),
  });
}

export async function resetUserAiPromptOverrideAction(promptKey: AiPromptKey) {
  return resetUserAiPromptOverride({
    ...promptMutationInput(undefined, promptKey),
    user: await requireCurrentUser(),
  });
}

export async function saveAiPromptOverridePolicyAction(formData: FormData) {
  return saveAiPromptOverridePolicy({
    ...promptMutationInput(formData),
    user: await requireCurrentUser(),
  });
}

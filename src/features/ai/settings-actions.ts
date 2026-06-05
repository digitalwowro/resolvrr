"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiSettingsRepository } from "@/data/ai-settings-repository";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import {
  loadWorkspaceAiSettings,
} from "./settings-service";
import {
  saveUserWorkspaceAiSettings,
  saveWorkspaceAiSettings,
} from "./settings-mutation-service";

export async function loadWorkspaceAiSettingsAction() {
  return loadWorkspaceAiSettings(
    prismaAiSettingsRepository,
    prismaHelpdeskConnectionsRepository,
    await requireCurrentUser(),
  );
}

export async function saveWorkspaceAiSettingsAction(formData: FormData) {
  return saveWorkspaceAiSettings({
    aiSummaryCacheRepository: prismaAiSummaryCacheRepository,
    connectionRepository: prismaHelpdeskConnectionsRepository,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    formData,
    repository: prismaAiSettingsRepository,
    user: await requireCurrentUser(),
  });
}

export async function saveUserWorkspaceAiSettingsAction(formData: FormData) {
  return saveUserWorkspaceAiSettings({
    aiSummaryCacheRepository: prismaAiSummaryCacheRepository,
    connectionRepository: prismaHelpdeskConnectionsRepository,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    formData,
    repository: prismaAiSettingsRepository,
    user: await requireCurrentUser(),
  });
}

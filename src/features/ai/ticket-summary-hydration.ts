import { env } from "@/config/env";
import type { TicketDetail } from "@/core/tickets";
import { prismaAiPromptRepository } from "@/data/ai-prompts-repository";
import { prismaAiSettingsRepository } from "@/data/ai-settings-repository";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { resolveEffectiveAiPrompt } from "./prompt-service";
import { ticketSummaryPromptKey } from "./prompt-registry";
import { resolveWorkspaceAiRuntimeConfig } from "./settings-service";
import { readCachedTicketSummary } from "./ticket-summary-cache";

type InitialTicketAiSummaryInput = {
  detail: TicketDetail;
  helpdeskConnectionId: string;
  throwOnCacheReadError?: boolean;
  workspaceId: string;
  ticketExternalId: string;
  userId: string;
};

// Cache-only selected-ticket summary hydration for coordinated detail loads.
export async function loadInitialTicketAiSummary({
  detail,
  helpdeskConnectionId,
  throwOnCacheReadError,
  workspaceId,
  ticketExternalId,
  userId,
}: InitialTicketAiSummaryInput) {
  const aiConfig = await resolveWorkspaceAiRuntimeConfig(
    prismaAiSettingsRepository,
    env.APP_ENCRYPTION_KEY,
    userId,
    workspaceId,
  );
  if (aiConfig.status !== "available") {
    return undefined;
  }

  return readCachedTicketSummary(
    aiConfig,
    detail,
    {
      cacheRepository: prismaAiSummaryCacheRepository,
      encryptionKey: env.APP_ENCRYPTION_KEY,
      throwOnReadError: throwOnCacheReadError,
      scope: { helpdeskConnectionId, ticketExternalId, userId },
    },
    await resolveEffectiveAiPrompt({
      encryptionKey: env.APP_ENCRYPTION_KEY,
      workspaceId,
      promptKey: ticketSummaryPromptKey,
      promptRepository: prismaAiPromptRepository,
      settingsRepository: prismaAiSettingsRepository,
      userId,
    }),
  );
}

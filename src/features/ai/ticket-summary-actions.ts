"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiPromptRepository } from "@/data/ai-prompts-repository";
import { prismaAiSettingsRepository } from "@/data/ai-settings-repository";
import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { providerRegistry } from "@/providers";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";
import type {
  SummarizeWorkspaceTicketAction,
  TicketAiSummaryResult,
} from "./model";
import { resolveWorkspaceAiRuntimeConfig } from "./settings-service";
import { summarizeTicketDetail } from "./ticket-summary-service";
import { resolveEffectiveAiPrompt } from "./prompt-service";
import { ticketSummaryPromptKey } from "./prompt-registry";

function unavailableTicketSummary(
  retryable: boolean,
): TicketAiSummaryResult {
  return {
    status: "unavailable",
    reason: "ticket-unavailable",
    retryable,
  };
}

function retryDelay(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 300));
}

export const summarizeWorkspaceTicketAction: SummarizeWorkspaceTicketAction =
  async ({
    forceRefresh,
    helpdeskConnectionId,
    ticketExternalId,
    workspaceId,
  }) => {
    const trimmedTicketId = ticketExternalId.trim();
    const trimmedConnectionId = helpdeskConnectionId.trim();
    const trimmedWorkspaceId = workspaceId.trim();
    if (!trimmedTicketId || !trimmedConnectionId || !trimmedWorkspaceId) {
      return unavailableTicketSummary(false);
    }

    const user = await requireCurrentUser();
    const detailResult = await loadWorkspaceTicketDetail(
      prismaHelpdeskConnectionsRepository,
      providerRegistry,
      env.APP_ENCRYPTION_KEY,
      user.id,
      trimmedTicketId,
      prismaTicketDetailCacheRepository,
      {
        cacheMode: "bypass",
        helpdeskConnectionId: trimmedConnectionId,
        workspaceId: trimmedWorkspaceId,
      },
    );
    if (
      detailResult.status !== "available" ||
      detailResult.helpdeskConnectionId !== trimmedConnectionId ||
      detailResult.workspaceId !== trimmedWorkspaceId
    ) {
      return unavailableTicketSummary(
        detailResult.status === "unavailable" && detailResult.retryable,
      );
    }

    const aiConfig = await resolveWorkspaceAiRuntimeConfig(
      prismaAiSettingsRepository,
      env.APP_ENCRYPTION_KEY,
      user.id,
      trimmedWorkspaceId,
    );
    const summaryPrompt = await resolveEffectiveAiPrompt({
      encryptionKey: env.APP_ENCRYPTION_KEY,
      workspaceId: trimmedWorkspaceId,
      promptKey: ticketSummaryPromptKey,
      promptRepository: prismaAiPromptRepository,
      settingsRepository: prismaAiSettingsRepository,
      userId: user.id,
    });

    const summarize = (config: typeof aiConfig) => summarizeTicketDetail(
      config,
      detailResult.detail,
      {
        cacheRepository: prismaAiSummaryCacheRepository,
        encryptionKey: env.APP_ENCRYPTION_KEY,
        scope: {
          helpdeskConnectionId: trimmedConnectionId,
          ticketExternalId: detailResult.detail.ticket.externalId,
          userId: user.id,
        },
      },
      summaryPrompt,
      { forceRefresh },
    );
    const firstResult = await summarize(aiConfig);
    if (
      firstResult.status !== "unavailable" ||
      firstResult.reason !== "provider-auth-failed"
    ) {
      return firstResult;
    }

    await retryDelay();
    const revalidatedConfig = await resolveWorkspaceAiRuntimeConfig(
      prismaAiSettingsRepository,
      env.APP_ENCRYPTION_KEY,
      user.id,
      trimmedWorkspaceId,
    );
    return summarize(revalidatedConfig);
  };

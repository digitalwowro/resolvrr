"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
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

function unavailableTicketSummary(
  retryable: boolean,
): TicketAiSummaryResult {
  return {
    status: "unavailable",
    reason: "ticket-unavailable",
    retryable,
  };
}

export const summarizeWorkspaceTicketAction: SummarizeWorkspaceTicketAction =
  async ({ ticketExternalId }) => {
    const trimmedTicketId = ticketExternalId.trim();
    if (!trimmedTicketId) {
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
      { cacheMode: "bypass" },
    );
    if (detailResult.status === "unavailable") {
      return unavailableTicketSummary(detailResult.retryable);
    }

    const aiConfig = detailResult.helpdeskConnectionId
      ? await resolveWorkspaceAiRuntimeConfig(
          prismaAiSettingsRepository,
          env.APP_ENCRYPTION_KEY,
          user.id,
          detailResult.helpdeskConnectionId,
        )
      : { status: "unconfigured" as const, reason: "no-active-workspace" as const };

    return summarizeTicketDetail(
      aiConfig,
      detailResult.detail,
      detailResult.helpdeskConnectionId
        ? {
            cacheRepository: prismaAiSummaryCacheRepository,
            encryptionKey: env.APP_ENCRYPTION_KEY,
            scope: {
              helpdeskConnectionId: detailResult.helpdeskConnectionId,
              ticketExternalId: trimmedTicketId,
              userId: user.id,
            },
          }
        : undefined,
    );
  };

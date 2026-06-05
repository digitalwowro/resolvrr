"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { providerRegistry } from "@/providers";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";
import type {
  SummarizeWorkspaceTicketAction,
  TicketAiSummaryResult,
} from "./model";
import { aiRuntimeConfigFromEnv } from "./provider-config";
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
    );
    if (detailResult.status === "unavailable") {
      return unavailableTicketSummary(detailResult.retryable);
    }

    return summarizeTicketDetail(
      aiRuntimeConfigFromEnv(env),
      detailResult.detail,
    );
  };

"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { loadInitialTicketAiSummary } from "@/features/ai/ticket-summary-hydration";
import type { TicketDetailCacheLoadOptions } from "@/features/tickets/cache-repository";
import { unavailableTicketRead } from "@/features/tickets/read-model";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";
import { workspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import { providerRegistry } from "@/providers";
import type {
  WorkspaceTicketDetailHydrationResult,
} from "./ticket-detail-hydration";

export async function loadWorkspaceTicketDetailHydrationAction(
  ticketExternalId: string,
  options?: TicketDetailCacheLoadOptions,
): Promise<WorkspaceTicketDetailHydrationResult> {
  const normalizedTicketExternalId = ticketExternalId.trim();
  if (!normalizedTicketExternalId) {
    return unavailableTicketRead("provider-unexpected-response");
  }

  const user = await requireCurrentUser();
  const result = await loadWorkspaceTicketDetail(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    normalizedTicketExternalId,
    prismaTicketDetailCacheRepository,
    options,
  );
  if (result.status !== "available") return result;

  const ticketId = result.detail.ticket.externalId;
  let summary;
  let summaryHydrated = false;
  if (result.helpdeskConnectionId && result.workspaceId) {
    try {
      summary = await loadInitialTicketAiSummary({
          detail: result.detail,
          helpdeskConnectionId: result.helpdeskConnectionId,
          throwOnCacheReadError: true,
          workspaceId: result.workspaceId,
          ticketExternalId: ticketId,
          userId: user.id,
        });
      summaryHydrated = true;
    } catch {
      // Ticket detail remains available; the client retains any prior summary.
    }
  }

  return {
    detail: workspaceTicketDetail(result.detail),
    resolution: result.resolution,
    status: "available",
    ...(summaryHydrated ? { summaryHydrated: true as const } : {}),
    ...(summary ? {
      initialTicketAiSummary: { result: summary, ticketId },
    } : {}),
  };
}

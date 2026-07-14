"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaTicketDetailCacheRepository } from "@/data/ticket-detail-cache-repository";
import { providerRegistry } from "@/providers";
import type { WorkspaceTicketDetailLoadResult } from "./detail-action-result";
import type { TicketDetailCacheLoadOptions } from "./cache-repository";
import { unavailableTicketRead } from "./read-model";
import { loadWorkspaceTicketDetail } from "./service";
import { workspaceTicketDetail } from "./workspace-adapter";

export async function loadWorkspaceTicketDetailAction(
  ticketExternalId: string,
  options?: TicketDetailCacheLoadOptions,
): Promise<WorkspaceTicketDetailLoadResult> {
  const normalizedTicketExternalId = ticketExternalId.trim();
  if (!normalizedTicketExternalId) {
    return unavailableTicketRead("provider-unexpected-response");
  }

  const user = await requireCurrentUser();
  const detailArgs = [
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    normalizedTicketExternalId,
    prismaTicketDetailCacheRepository,
  ] as const;
  const result = options
    ? await loadWorkspaceTicketDetail(...detailArgs, options)
    : await loadWorkspaceTicketDetail(...detailArgs);

  if (result.status !== "available") {
    return result;
  }

  return {
    status: "available",
    detail: workspaceTicketDetail(result.detail),
    resolution: result.resolution,
  };
}

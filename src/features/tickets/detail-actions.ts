"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type { WorkspaceTicketDetailLoadResult } from "./detail-action-result";
import { unavailableTicketRead } from "./read-model";
import { loadWorkspaceTicketDetail } from "./service";
import { workspaceTicketDetail } from "./workspace-adapter";

export async function loadWorkspaceTicketDetailAction(
  ticketExternalId: string,
): Promise<WorkspaceTicketDetailLoadResult> {
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
  );

  if (result.status === "unavailable") {
    return result;
  }

  return {
    status: "available",
    detail: workspaceTicketDetail(result.detail),
  };
}

"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type { WorkspaceTicketLinkTargetSearchResult } from "./link-target-search-action-result";
import { searchWorkspaceTicketLinkTargets } from "./link-target-service";
import { unavailableTicketRead } from "./read-model";

export async function searchWorkspaceTicketLinkTargetsAction({
  customerExternalId,
  excludeTicketExternalId,
  query,
}: {
  customerExternalId?: string;
  excludeTicketExternalId?: string;
  query?: string;
}): Promise<WorkspaceTicketLinkTargetSearchResult> {
  const normalizedQuery = query?.trim() ?? "";
  const normalizedCustomerExternalId = customerExternalId?.trim();
  if (!normalizedQuery && !normalizedCustomerExternalId) {
    return { status: "available", targets: [] };
  }

  const user = await requireCurrentUser();
  const result = await searchWorkspaceTicketLinkTargets(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    {
      ...(normalizedCustomerExternalId
        ? { customerExternalId: normalizedCustomerExternalId }
        : {}),
      ...(excludeTicketExternalId ? { excludeTicketExternalId } : {}),
      ...(normalizedQuery ? { query: normalizedQuery } : {}),
    },
  );

  if (result.status === "unavailable") {
    return unavailableTicketRead(result.reason, result.retryable);
  }

  return result;
}

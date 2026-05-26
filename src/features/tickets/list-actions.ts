"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type { WorkspaceTicketListPageLoadResult } from "./list-page-action-result";
import { unavailableTicketRead } from "./read-model";
import { loadWorkspaceTicketList } from "./service";
import { workspaceTicketRows } from "./workspace-adapter";

export async function loadWorkspaceTicketListPageAction(
  cursor: string,
): Promise<WorkspaceTicketListPageLoadResult> {
  const normalizedCursor = cursor.trim();
  if (!normalizedCursor) {
    return unavailableTicketRead("provider-unexpected-response");
  }

  const user = await requireCurrentUser();
  const result = await loadWorkspaceTicketList(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    { cursor: normalizedCursor },
  );

  if (result.status === "unavailable") {
    return result;
  }

  return {
    status: "available",
    rows: workspaceTicketRows(result.tickets),
    loadedCount: result.loadedCount,
    totalCount: result.totalCount,
    nextCursor: result.nextCursor,
  };
}

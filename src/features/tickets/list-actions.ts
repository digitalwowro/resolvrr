"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type { WorkspaceTicketListPageLoadResult } from "./list-action-result";
import { unavailableTicketRead } from "./read-model";
import { loadWorkspaceTicketList } from "./service";
import { workspaceTicketRows, workspaceTicketTabs } from "./workspace-adapter";

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

  const rows = workspaceTicketRows(result.tickets);

  return {
    status: "available",
    page: {
      rows,
      tabs: workspaceTicketTabs(rows),
      loadedCount: result.loadedCount,
      totalCount: result.totalCount,
      nextCursor: result.nextCursor,
    },
  };
}

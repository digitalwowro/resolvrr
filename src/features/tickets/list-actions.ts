"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import type { TicketSort, TicketSortKey } from "@/core/providers";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type {
  WorkspaceTicketListPageLoadResult,
  WorkspaceTicketListPageRequest,
  WorkspaceTicketListSort,
} from "./list-page-action-result";
import { unavailableTicketRead } from "./read-model";
import { loadWorkspaceTicketList } from "./service";
import type { WorkspaceTicketSortKey } from "./workspace-adapter";
import { workspaceTicketRows } from "./workspace-adapter";

const workspaceSortKeyMap: Record<WorkspaceTicketSortKey, TicketSortKey> = {
  number: "number",
  title: "title",
  customer: "customer",
  owner: "owner",
  state: "state",
  priority: "priority",
  pendingTill: "pendingUntil",
  updatedAt: "updatedAt",
};

function ticketListSort(sort: WorkspaceTicketListSort): TicketSort {
  return {
    key: workspaceSortKeyMap[sort.key],
    direction: sort.direction,
  };
}

export async function loadWorkspaceTicketListPageAction(
  request: WorkspaceTicketListPageRequest,
): Promise<WorkspaceTicketListPageLoadResult> {
  const normalizedCursor = request.cursor?.trim();
  if (request.cursor !== undefined && !normalizedCursor) {
    return unavailableTicketRead("provider-unexpected-response");
  }

  const user = await requireCurrentUser();
  const result = await loadWorkspaceTicketList(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    {
      ...(normalizedCursor ? { cursor: normalizedCursor } : {}),
      ...(request.sort ? { sort: ticketListSort(request.sort) } : {}),
    },
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

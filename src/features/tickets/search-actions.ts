"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { validateTicketSearchQuery } from "@/core/ticket-search";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { providerRegistry } from "@/providers";
import type {
  WorkspaceTicketSearchRequest,
  WorkspaceTicketSearchResult,
} from "./search-action-result";
import { unavailableTicketRead } from "./read-model";
import { loadWorkspaceTicketList } from "./service";
import { workspaceTicketRows } from "./workspace-adapter";
import {
  providerCanSortWorkspaceTickets,
  providerTicketListSort,
} from "./workspace-list-sort";
import {
  workspaceQuickSearchPageSize,
  workspaceTicketListPageSize,
} from "./list-page-sizes";

function validMode(
  mode: WorkspaceTicketSearchRequest["mode"],
): mode is "quick" | "detailed" {
  return mode === "quick" || mode === "detailed";
}

export async function searchWorkspaceTicketsAction(
  request: WorkspaceTicketSearchRequest,
): Promise<WorkspaceTicketSearchResult> {
  const validation = validateTicketSearchQuery(request.query);
  const cursor = request.cursor?.trim();
  if (
    !validMode(request.mode) ||
    validation.status === "invalid" ||
    (request.cursor !== undefined && !cursor) ||
    (request.sort && !providerCanSortWorkspaceTickets(request.sort))
  ) {
    return unavailableTicketRead("invalid-search-query");
  }

  const user = await requireCurrentUser();
  const appliedSort = request.sort ?? {
    key: "updatedAt" as const,
    direction: "descending" as const,
  };
  const result = await loadWorkspaceTicketList(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    {
      filter: { searchText: validation.query },
      pageSize:
        request.mode === "quick"
          ? workspaceQuickSearchPageSize
          : workspaceTicketListPageSize,
      count: { includeTotal: true },
      ...(cursor ? { cursor } : {}),
      sort: providerTicketListSort(appliedSort),
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
    appliedSort,
  };
}

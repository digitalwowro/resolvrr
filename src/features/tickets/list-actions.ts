"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import type {
  TicketListQueryInput,
  TicketSort,
  TicketSortKey,
} from "@/core/providers";
import { ticketPriorities, ticketStates } from "@/core/tickets";
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
import {
  workspaceTicketListGroups,
  workspaceTicketRows,
} from "./workspace-adapter";

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

function groupFilter(
  request: WorkspaceTicketListPageRequest,
): TicketListQueryInput["filter"] | undefined {
  if (!request.group || !request.bucketValue) {
    return undefined;
  }

  if (request.group === "state") {
    const state = request.bucketValue as (typeof ticketStates)[number];
    if (!ticketStates.includes(state)) {
      return undefined;
    }
    return { states: [state] };
  }

  const priority = request.bucketValue as (typeof ticketPriorities)[number];
  if (!ticketPriorities.includes(priority)) {
    return undefined;
  }
  return { priorities: [priority] };
}

function ticketListQuery(
  request: WorkspaceTicketListPageRequest,
): TicketListQueryInput {
  const filter = groupFilter(request);

  return {
    ...(request.cursor ? { cursor: request.cursor } : {}),
    ...(request.sort ? { sort: ticketListSort(request.sort) } : {}),
    ...(request.group && !request.bucketValue
      ? { count: { includeTotal: true }, group: { key: request.group } }
      : {}),
    ...(filter ? { filter } : {}),
  };
}

export async function loadWorkspaceTicketListPageAction(
  request: WorkspaceTicketListPageRequest,
): Promise<WorkspaceTicketListPageLoadResult> {
  const normalizedCursor = request.cursor?.trim();
  if (request.cursor !== undefined && !normalizedCursor) {
    return unavailableTicketRead("provider-unexpected-response");
  }
  if (request.bucketValue && !groupFilter(request)) {
    return unavailableTicketRead("provider-unexpected-response");
  }

  const user = await requireCurrentUser();
  const result = await loadWorkspaceTicketList(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    ticketListQuery({
      ...request,
      ...(normalizedCursor ? { cursor: normalizedCursor } : {}),
    }),
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
    groups: workspaceTicketListGroups(result.buckets),
  };
}

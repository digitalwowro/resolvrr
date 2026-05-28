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
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import {
  allTicketsSavedViewId,
  type StoredSavedView,
} from "@/features/saved-views";
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
const ticketSortKeyMap = Object.fromEntries(
  Object.entries(workspaceSortKeyMap).map(([workspaceKey, ticketKey]) => [
    ticketKey,
    workspaceKey,
  ]),
) as Partial<Record<TicketSortKey, WorkspaceTicketSortKey>>;

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

function workspaceSort(sort: TicketSort | undefined): WorkspaceTicketListSort | undefined {
  const key = sort ? ticketSortKeyMap[sort.key] : undefined;
  return key && sort
    ? {
        key,
        direction: sort.direction,
      }
    : undefined;
}

function providerBackedGroup(
  group: WorkspaceTicketListPageRequest["group"] | StoredSavedView["group"],
) {
  const groupKey = typeof group === "string" ? group : group?.key;
  return groupKey === "state" || groupKey === "priority" ? groupKey : undefined;
}

function ticketListQuery(
  request: WorkspaceTicketListPageRequest,
  savedView?: StoredSavedView,
): TicketListQueryInput {
  const filter = groupFilter(request);
  const savedGroup = savedView?.query.group;
  const providerGroup = request.group ?? providerBackedGroup(savedGroup);
  const nextFilter = {
    ...savedView?.query.filter,
    ...filter,
  };

  return {
    ...(request.cursor ? { cursor: request.cursor } : {}),
    ...(request.sort
      ? { sort: ticketListSort(request.sort) }
      : savedView?.query.sort
        ? { sort: savedView.query.sort }
        : {}),
    ...(providerGroup && !request.bucketValue
      ? { count: { includeTotal: true }, group: { key: providerGroup } }
      : {}),
    ...(Object.keys(nextFilter).length > 0 ? { filter: nextFilter } : {}),
  };
}

async function savedViewForRequest(userId: string, savedViewId: string | undefined) {
  if (!savedViewId || savedViewId === allTicketsSavedViewId) {
    return undefined;
  }

  return prismaSavedViewsRepository.findForUser(userId, savedViewId);
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
  const savedView = await savedViewForRequest(user.id, request.savedViewId);
  if (savedView === null) {
    return unavailableTicketRead("provider-unexpected-response");
  }

  const result = await loadWorkspaceTicketList(
    prismaHelpdeskConnectionsRepository,
    providerRegistry,
    env.APP_ENCRYPTION_KEY,
    user.id,
    ticketListQuery({
      ...request,
      ...(normalizedCursor ? { cursor: normalizedCursor } : {}),
    }, savedView),
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
    appliedGroupBy: request.group ?? savedView?.query.group?.key,
    appliedSavedViewId: request.savedViewId ?? allTicketsSavedViewId,
    appliedSort: request.sort ?? workspaceSort(savedView?.query.sort),
  };
}

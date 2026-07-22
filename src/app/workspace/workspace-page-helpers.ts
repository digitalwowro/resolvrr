import type { TicketListQueryInput } from "@/core/providers";
import { prismaSavedViewSelectionRepository } from "@/data/saved-view-selection-repository";
import { prismaWorkspaceTabsRepository } from "@/data/workspace-tabs-repository";
import type { StoredSavedView } from "@/features/saved-views";
import type { ConnectionListItem } from "@/features/helpdesk-connections/service-types";
import {
  workspaceGroupedTicketListPageSize,
  workspaceTicketListPageSize,
} from "@/features/tickets/list-page-sizes";
import type { TicketDetailReadResult } from "@/features/tickets/read-model";
import { workspaceTicketDetail } from "@/features/tickets/workspace-adapter";

export function workspaceUiPreferenceSeed(userId: string, workspaceId: string) {
  return Promise.all([
    prismaWorkspaceTabsRepository.getForUser(userId, workspaceId),
    prismaSavedViewSelectionRepository.getForUser(userId, workspaceId),
  ]);
}

export function workspaceDetailSeed(
  result: TicketDetailReadResult | undefined,
  selectedTicketId: string | undefined,
) {
  const detailResult = result?.status === "available"
    ? {
        status: "available" as const,
        detail: workspaceTicketDetail(result.detail),
        resolution: result.resolution,
      }
    : result;
  return {
    detail: detailResult?.status === "available"
      ? detailResult.detail
      : undefined,
    detailResult,
    selectedTicketId:
      result?.status === "available" && result.resolution
        ? result.resolution.targetExternalId
        : selectedTicketId,
  };
}

export function savedViewTicketListQuery(
  savedView: StoredSavedView | undefined,
): TicketListQueryInput {
  if (!savedView) {
    return { pageSize: workspaceTicketListPageSize };
  }

  const providerBackedGroup =
    savedView.query.group?.key === "state" ||
    savedView.query.group?.key === "priority"
      ? savedView.query.group
      : undefined;

  return {
    filter: savedView.query.filter,
    pageSize: providerBackedGroup
      ? workspaceGroupedTicketListPageSize
      : workspaceTicketListPageSize,
    ...(savedView.query.sort ? { sort: savedView.query.sort } : {}),
    ...(providerBackedGroup
      ? { count: { includeTotal: true }, group: providerBackedGroup }
      : {}),
  };
}

export function workspaceMenuConnections(
  connections: ConnectionListItem[],
) {
  return connections.map((connection) => ({
    active: connection.active,
    baseUrl: connection.baseUrl,
    id: connection.id,
    label: connection.displayName,
    providerKey: connection.providerKey,
    providerLabel: connection.providerLabel,
    status: connection.status,
    connectionId: connection.connectionId,
    connectedAs: connection.connectedAs,
    identityVersion: connection.identityVersion,
    access: connection.access,
  }));
}

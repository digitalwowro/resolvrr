import type { TicketListQueryInput } from "@/core/providers";
import type { StoredSavedView } from "@/features/saved-views";
import type { ConnectionListItem } from "@/features/helpdesk-connections/service-types";
import type { TicketDetailReadResult } from "@/features/tickets/read-model";
import { workspaceTicketDetail } from "@/features/tickets/workspace-adapter";

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
): TicketListQueryInput | undefined {
  if (!savedView) {
    return undefined;
  }

  const providerBackedGroup =
    savedView.query.group?.key === "state" ||
    savedView.query.group?.key === "priority"
      ? savedView.query.group
      : undefined;

  return {
    filter: savedView.query.filter,
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

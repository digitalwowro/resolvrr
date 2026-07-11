import type { TicketListQueryInput } from "@/core/providers";
import type { StoredSavedView } from "@/features/saved-views";
import type { ConnectionListItem } from "@/features/helpdesk-connections/service-types";

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
  }));
}

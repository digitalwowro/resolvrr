import type { TicketSort, TicketSortKey } from "@/core/providers";
import { isCompleteResultTicketSortKey } from "@/core/ticket-list-query";
import type { WorkspaceTicketListSort } from "./list-page-action-result";
import type { WorkspaceTicketSortKey } from "./workspace-adapter";

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

export function providerTicketListSort(
  sort: WorkspaceTicketListSort,
): TicketSort {
  return {
    key: workspaceSortKeyMap[sort.key],
    direction: sort.direction,
  };
}

export function providerCanSortWorkspaceTickets(
  sort: WorkspaceTicketListSort,
) {
  return !isCompleteResultTicketSortKey(workspaceSortKeyMap[sort.key]);
}

export function workspaceTicketListSort(
  sort: TicketSort | undefined,
): WorkspaceTicketListSort | undefined {
  const key = sort ? ticketSortKeyMap[sort.key] : undefined;
  return key && sort ? { key, direction: sort.direction } : undefined;
}

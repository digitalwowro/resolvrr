import type { WorkspaceTicketListGroup } from "@/features/tickets/list-page-action-result";
import type {
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";

export function isProviderGroupedListActive({
  groupBy,
  listGroupBy,
  listGroups,
  providerGroupingEnabled,
}: {
  groupBy: WorkspaceTicketGroupKey;
  listGroupBy?: WorkspaceTicketGroupKey;
  listGroups?: WorkspaceTicketListGroup[];
  providerGroupingEnabled: boolean;
}) {
  return providerGroupingEnabled &&
    (groupBy === "state" || groupBy === "priority") &&
    listGroupBy === groupBy &&
    listGroups !== undefined;
}

export function activeTicketSummaryFromWorkspace({
  activeTicketId,
  openTicketTabs,
  tableRows,
}: {
  activeTicketId?: string;
  openTicketTabs: WorkspaceTicketTab[];
  tableRows: WorkspaceTicketRow[];
}) {
  return activeTicketId
    ? tableRows.find((ticket) => ticket.id === activeTicketId) ??
      openTicketTabs.find((ticket) => ticket.id === activeTicketId)
    : undefined;
}

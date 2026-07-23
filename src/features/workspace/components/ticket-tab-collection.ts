import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { workspaceOpenTabsLimit } from "@/features/workspace/workspace-tab-state";

function sameTicketTab(left: WorkspaceTicketTab, right: WorkspaceTicketTab) {
  return left.id === right.id &&
    left.number === right.number &&
    left.title === right.title &&
    left.customer === right.customer &&
    left.customerExternalId === right.customerExternalId &&
    left.customerOrganization === right.customerOrganization &&
    left.owner === right.owner &&
    left.group === right.group &&
    left.state === right.state &&
    left.stateKey === right.stateKey &&
    left.priority === right.priority &&
    left.priorityKey === right.priorityKey;
}

export function sameTicketTabs(
  left: WorkspaceTicketTab[],
  right: WorkspaceTicketTab[],
) {
  return left.length === right.length &&
    left.every((tab, index) => {
      const other = right[index];
      return Boolean(other && sameTicketTab(tab, other));
    });
}

export function ticketTabsWithOpenedTicket(
  tabs: WorkspaceTicketTab[],
  openedTab: WorkspaceTicketTab,
) {
  if (tabs.some((tab) => tab.id === openedTab.id)) return tabs;
  if (tabs.length < workspaceOpenTabsLimit) return [...tabs, openedTab];
  return [...tabs.slice(0, workspaceOpenTabsLimit - 1), openedTab];
}

export function reorderedTicketTabs(
  current: WorkspaceTicketTab[],
  sourceTicketId: string,
  targetIndex: number,
) {
  const sourceIndex = current.findIndex((tab) => tab.id === sourceTicketId);
  if (sourceIndex === -1) return current;
  const next = current.filter((tab) => tab.id !== sourceTicketId);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, current[sourceIndex]);
  return next.every((tab, index) => tab.id === current[index]?.id) ? current : next;
}

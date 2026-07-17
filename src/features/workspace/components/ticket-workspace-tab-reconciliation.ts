import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import {
  cappedWorkspaceTabs,
  workspaceOpenTabsLimit,
} from "@/features/workspace/workspace-tab-state";

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

export function reconciledTicketTabs(
  synchronizedTabs: WorkspaceTicketTab[],
  currentTabs: WorkspaceTicketTab[],
  protectedTicketIds: string[],
  synchronizedActiveTicketId?: string,
) {
  const protectedIds = new Set(protectedTicketIds);
  const synchronizedIds = new Set(synchronizedTabs.map((tab) => tab.id));
  const requiredIds = new Set([
    ...protectedIds,
    ...(synchronizedActiveTicketId ? [synchronizedActiveTicketId] : []),
  ]);
  const candidates = [
    ...synchronizedTabs,
    ...currentTabs.filter(
      (tab) => protectedIds.has(tab.id) && !synchronizedIds.has(tab.id),
    ),
  ];
  const reconciled = cappedRetainingRequiredTabs(candidates, requiredIds);
  return sameTicketTabs(currentTabs, reconciled) ? currentTabs : reconciled;
}

function cappedRetainingRequiredTabs(
  tabs: WorkspaceTicketTab[],
  requiredIds: Set<string>,
) {
  const capped = cappedWorkspaceTabs(tabs);
  for (const requiredTab of tabs.filter((tab) => requiredIds.has(tab.id))) {
    if (capped.some((tab) => tab.id === requiredTab.id)) continue;
    let replaceIndex = -1;
    for (let index = capped.length - 1; index >= 0; index -= 1) {
      const tab = capped[index];
      if (tab && !requiredIds.has(tab.id)) {
        replaceIndex = index;
        break;
      }
    }
    if (replaceIndex < 0) break;
    capped[replaceIndex] = requiredTab;
  }
  return capped;
}

export function ticketTabsWithOpenedTicket(
  tabs: WorkspaceTicketTab[],
  openedTab: WorkspaceTicketTab,
) {
  if (tabs.some((tab) => tab.id === openedTab.id)) return tabs;
  if (tabs.length < workspaceOpenTabsLimit) return [...tabs, openedTab];
  return [...tabs.slice(0, workspaceOpenTabsLimit - 1), openedTab];
}

export function reconciledActiveTicketId(
  tabs: WorkspaceTicketTab[],
  currentActiveTicketId?: string,
  synchronizedActiveTicketId?: string,
): string | null | undefined {
  if (
    synchronizedActiveTicketId &&
    synchronizedActiveTicketId !== currentActiveTicketId &&
    tabs.some((tab) => tab.id === synchronizedActiveTicketId)
  ) {
    return synchronizedActiveTicketId;
  }
  if (currentActiveTicketId && !tabs.some((tab) => tab.id === currentActiveTicketId)) {
    return tabs[0]?.id ?? null;
  }
  return undefined;
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

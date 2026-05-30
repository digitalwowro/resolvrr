import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";

export function mergeTicketTabs(
  initialTabs: WorkspaceTicketTab[],
  rowTabs: WorkspaceTicketTab[],
) {
  const tabsById = new Map(initialTabs.map((tab) => [tab.id, tab]));
  for (const tab of rowTabs) {
    tabsById.set(tab.id, tab);
  }
  return [...tabsById.values()];
}

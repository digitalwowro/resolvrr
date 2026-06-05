import type {
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";

function stripTicketNumberPrefix(number: string) {
  return number.replace(/^#/u, "");
}

export function tabLinkTarget(
  tab: WorkspaceTicketTab,
): WorkspaceTicketLinkTarget {
  return {
    customer: tab.customer,
    externalId: tab.id,
    number: stripTicketNumberPrefix(tab.number),
    priority: tab.priorityKey,
    state: tab.stateKey,
    title: tab.title,
  };
}

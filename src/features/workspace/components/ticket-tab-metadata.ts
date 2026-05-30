import {
  ticketPriorityDefinitions,
  ticketStateDefinitions,
} from "@/core/tickets";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import type { TicketMetadataSavedPatch } from "./metadata-draft";

export function patchTicketTabMetadata(
  tabs: WorkspaceTicketTab[],
  { group, owner, priority, state, ticketExternalId }: TicketMetadataSavedPatch,
): WorkspaceTicketTab[] {
  if (!state && !priority && !owner && !group) {
    return tabs;
  }

  return tabs.map((tab) =>
    tab.id === ticketExternalId
      ? {
          ...tab,
          ...(owner ? { owner } : {}),
          ...(group ? { group } : {}),
          ...(state
            ? { state: ticketStateDefinitions[state].label, stateKey: state }
            : {}),
          ...(priority
            ? {
                priority: ticketPriorityDefinitions[priority].label,
                priorityKey: priority,
              }
            : {}),
        }
      : tab,
  );
}

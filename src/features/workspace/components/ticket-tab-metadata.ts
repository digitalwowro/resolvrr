import {
  ticketPriorityDefinitions,
  ticketStateDefinitions,
} from "@/core/tickets";
import type { WorkspaceTicketTab } from "@/features/tickets";
import type { TicketMetadataSavedPatch } from "./metadata-draft";

export function patchTicketTabMetadata(
  tabs: WorkspaceTicketTab[],
  { priority, state, ticketExternalId }: TicketMetadataSavedPatch,
): WorkspaceTicketTab[] {
  if (!state && !priority) {
    return tabs;
  }

  return tabs.map((tab) =>
    tab.id === ticketExternalId
      ? {
          ...tab,
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

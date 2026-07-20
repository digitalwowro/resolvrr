import { clearPersistedCommunicationDrafts } from "./ticket-communication-draft-persistence";
import type { TicketWorkspaceScope } from "./ticket-workspace-scope";

export function closeTicketWithDraftClear(
  ticketId: string,
  scope: TicketWorkspaceScope | undefined,
  closeTicket: (ticketId: string) => void,
) {
  if (scope) {
    void clearPersistedCommunicationDrafts({
      ...scope,
      ticketExternalId: ticketId,
    });
  }
  closeTicket(ticketId);
}

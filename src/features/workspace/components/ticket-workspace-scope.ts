import type { CommunicationDraftPersistenceScope } from "./ticket-communication-draft-persistence";

export type TicketWorkspaceScope = Omit<
  CommunicationDraftPersistenceScope,
  "ticketExternalId"
>;

export function ticketWorkspaceScope(
  userId?: string,
  workspaceId?: string,
  helpdeskConnectionId?: string,
  identityVersion?: string,
): TicketWorkspaceScope | undefined {
  return userId && workspaceId && helpdeskConnectionId && identityVersion
    ? { userId, workspaceId, helpdeskConnectionId, identityVersion }
    : undefined;
}

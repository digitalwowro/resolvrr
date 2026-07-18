export const ticketConversationHistoryScopes = [
  "current",
  "through-source",
] as const;

export type TicketConversationHistoryScope =
  (typeof ticketConversationHistoryScopes)[number];

export type TicketConversationHistoryContext = {
  contextVersion: string;
  messageCount: number;
  scope: TicketConversationHistoryScope;
};

export function isTicketConversationHistoryScope(
  value: unknown,
): value is TicketConversationHistoryScope {
  return ticketConversationHistoryScopes.includes(
    value as TicketConversationHistoryScope,
  );
}

import type { TicketExternalId } from "./tickets";

export const ticketSelectableStates = [
  "new",
  "open",
  "pending_reminder",
  "pending_close",
  "closed",
] as const;

export type TicketSelectableState = (typeof ticketSelectableStates)[number];
export type TicketMutableState = TicketSelectableState;
export type TicketState = TicketSelectableState | "merged";

export type TicketMergeResolution = {
  cause: "merged";
  sources: Array<{ externalId: TicketExternalId; number?: string }>;
  targetExternalId: TicketExternalId;
};

export function isTicketSelectableState(
  state: TicketState | undefined,
): state is TicketSelectableState {
  return Boolean(
    state && ticketSelectableStates.includes(state as TicketSelectableState),
  );
}

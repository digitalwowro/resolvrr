import {
  type Ticket,
  type TicketMetadataMutationConstraints,
  type TicketState,
} from "@/core/tickets";

const pendingStates = new Set<TicketState>([
  "pending_reminder",
  "pending_close",
]);

export function zammadStateMutationUnavailableReason(
  ticket: Pick<Ticket, "pendingUntil" | "state">,
  targetState: TicketState,
): string | undefined {
  if (targetState === ticket.state) {
    return undefined;
  }

  if (targetState === "new" && ticket.state && ticket.state !== "new") {
    return "Zammad does not allow tickets to return to New after they leave New.";
  }

  return undefined;
}

export function zammadStateRequiresPendingDate(state: TicketState): boolean {
  return pendingStates.has(state);
}

export function zammadMetadataMutationConstraints(
  ticket: Pick<Ticket, "pendingUntil" | "state">,
): TicketMetadataMutationConstraints | undefined {
  void ticket;

  return {
    hiddenStates: ["new"],
    pendingDateRequiredStates: {
      pending_reminder: "Choose a future pending date and time.",
      pending_close: "Choose a future pending date and time.",
    },
  };
}

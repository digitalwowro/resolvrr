import type { DropdownOption } from "@/components/ui";
import {
  ticketStates,
  ticketStateDefinitions,
  type TicketMutableState,
} from "@/core/tickets";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import { StateIcon } from "./ticket-table-cells";

const stateOptions: DropdownOption[] = ticketStates.map((state) => ({
  value: state,
  label: ticketStateDefinitions[state].label,
  icon: <StateIcon state={state} />,
}));

export function stateOptionsFor(detail: WorkspaceTicketDetail): DropdownOption[] {
  const hiddenStates = new Set(
    detail.metadataMutationConstraints?.hiddenStates ?? [],
  );

  return stateOptions.filter(
    (option) => !hiddenStates.has(option.value as TicketMutableState),
  );
}

export function stateRequiresPendingDate(
  detail: WorkspaceTicketDetail,
  state: TicketMutableState | undefined,
): boolean {
  if (!state) {
    return false;
  }

  return Boolean(
    detail.metadataMutationConstraints?.pendingDateRequiredStates?.[state],
  );
}

export function selectedStateDisplay(state: TicketMutableState | undefined) {
  return state
    ? {
        label: ticketStateDefinitions[state].label,
        icon: <StateIcon state={state} />,
      }
    : undefined;
}

export function stateMutationLabel(state: TicketMutableState | undefined): string {
  return state ? ticketStateDefinitions[state].label : "Pending";
}

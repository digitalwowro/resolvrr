import type { DropdownOption } from "@/components/ui";
import {
  ticketStates,
  ticketStateDefinitions,
  type TicketState,
} from "@/core/tickets";
import type { WorkspaceTicketDetail } from "@/features/tickets";
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
    (option) => !hiddenStates.has(option.value as TicketState),
  );
}

export function stateRequiresPendingDate(
  detail: WorkspaceTicketDetail,
  state: TicketState,
): boolean {
  return Boolean(
    detail.metadataMutationConstraints?.pendingDateRequiredStates?.[state],
  );
}

export function selectedStateDisplay(state: TicketState | undefined) {
  return state
    ? {
        label: ticketStateDefinitions[state].label,
        icon: <StateIcon state={state} />,
      }
    : undefined;
}

export function stateMutationLabel(state: TicketState): string {
  return ticketStateDefinitions[state].label;
}

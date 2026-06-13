import type { DropdownOption } from "@/components/ui";
import {
  ticketPriorities,
  ticketPriorityDefinitions,
} from "@/core/tickets";
import { PriorityIcon } from "./ticket-table-cells";

export const priorityOptions: DropdownOption[] = ticketPriorities.map(
  (priority) => ({
    value: priority,
    label: ticketPriorityDefinitions[priority].label,
    icon: <PriorityIcon filled={false} priority={priority} />,
  }),
);

import type { TicketPriority } from "@/core/tickets";
import { PriorityIcon } from "./ticket-table-cells";

export function TicketPriorityDot({
  priority,
  priorityLabel,
}: {
  priority?: TicketPriority;
  priorityLabel: string;
}) {
  return (
    <span
      aria-label={`Ticket priority: ${priorityLabel}`}
      className="inline-flex shrink-0 items-center"
    >
      <PriorityIcon priority={priority} sizeClassName="size-4" />
    </span>
  );
}

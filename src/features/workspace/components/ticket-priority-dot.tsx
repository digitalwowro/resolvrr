import type { TicketPriority } from "@/core/tickets";
import { cn } from "@/components/ui/classnames";

const priorityDotClass: Record<TicketPriority | "unknown", string> = {
  low: "bg-emerald-600",
  medium: "bg-indigo-600",
  high: "bg-rose-600",
  unknown: "bg-slate-500",
};

export function TicketPriorityDot({
  priority,
  priorityLabel,
}: {
  priority?: TicketPriority;
  priorityLabel: string;
}) {
  const key = priority ?? "unknown";

  return (
    <span
      aria-label={`Ticket priority: ${priorityLabel}`}
      className={cn("size-2.5 shrink-0 rounded-full", priorityDotClass[key])}
    />
  );
}

import { cn } from "@/components/ui/classnames";
import type { TicketState } from "@/core/tickets";

const stateBadgeClass: Record<TicketState | "unknown", string> = {
  new: "bg-rose-50 text-rose-700",
  open: "bg-indigo-50 text-indigo-700",
  pending_reminder: "bg-amber-50 text-amber-700",
  pending_close: "bg-violet-50 text-violet-700",
  closed: "bg-emerald-50 text-emerald-700",
  unknown: "bg-slate-100 text-slate-700",
};

export function TicketStateBadge({
  label,
  state,
}: {
  label: string;
  state?: TicketState;
}) {
  return (
    <span
      aria-label={`Ticket state: ${label}`}
      className={cn(
        "inline-flex h-5 shrink-0 items-center rounded-md px-2 text-xs font-medium",
        stateBadgeClass[state ?? "unknown"],
      )}
    >
      {label}
    </span>
  );
}

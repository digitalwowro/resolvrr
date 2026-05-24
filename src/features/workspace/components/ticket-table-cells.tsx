import {
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  PauseCircle,
  SignalHigh,
  SignalLow,
  SignalMedium,
  type LucideIcon,
} from "lucide-react";
import type { TicketPriority, TicketState } from "@/core/tickets";

const stateClass: Record<TicketState | "unknown", string> = {
  new: "text-rose-600",
  open: "text-indigo-600",
  pending_reminder: "text-amber-600",
  pending_close: "text-violet-600",
  closed: "text-emerald-600",
  unknown: "text-slate-500",
};

const stateIcon: Record<TicketState | "unknown", LucideIcon> = {
  new: CirclePlus,
  open: Circle,
  pending_reminder: Clock3,
  pending_close: PauseCircle,
  closed: CheckCircle2,
  unknown: Circle,
};

const priorityClass: Record<TicketPriority | "unknown", string> = {
  low: "text-emerald-600",
  medium: "text-indigo-600",
  high: "text-rose-600",
  unknown: "text-slate-500",
};

const priorityIcon: Record<TicketPriority | "unknown", LucideIcon> = {
  low: SignalLow,
  medium: SignalMedium,
  high: SignalHigh,
  unknown: SignalMedium,
};

export function StateCell({
  label,
  monochrome = false,
  state,
}: {
  label: string;
  monochrome?: boolean;
  state?: TicketState;
}) {
  const key = state ?? "unknown";
  const Icon = stateIcon[key];
  const iconClass = monochrome ? "size-3.5" : `size-3.5 ${stateClass[key]}`;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon aria-hidden="true" className={iconClass} />
      <span className="truncate">{label}</span>
    </span>
  );
}

export function PriorityCell({
  label,
  monochrome = false,
  priority,
}: {
  label: string;
  monochrome?: boolean;
  priority?: TicketPriority;
}) {
  const key = priority ?? "unknown";
  const Icon = priorityIcon[key];
  const iconClass = monochrome
    ? "size-3.5"
    : `size-3.5 ${priorityClass[key]}`;

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <Icon aria-hidden="true" className={iconClass} />
      <span className="truncate">{label}</span>
    </span>
  );
}

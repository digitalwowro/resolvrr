import {
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  Flag,
  PauseCircle,
  Triangle,
  type LucideIcon,
} from "lucide-react";
import type { TicketPriority, TicketState } from "@/core/tickets";
import { TicketStateBadge } from "./ticket-state-badge";

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
  low: "text-slate-500",
  medium: "text-amber-500",
  high: "text-rose-600",
  unknown: "text-slate-500",
};

const priorityPillClass: Record<TicketPriority | "unknown", string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-amber-50 text-amber-700",
  high: "bg-rose-50 text-rose-700",
  unknown: "bg-slate-100 text-slate-700",
};

const priorityIcon: Record<TicketPriority | "unknown", LucideIcon> = {
  low: Circle,
  medium: Triangle,
  high: Flag,
  unknown: Circle,
};

export function StateIcon({
  monochrome = false,
  state,
}: {
  monochrome?: boolean;
  state?: TicketState;
}) {
  const key = state ?? "unknown";
  const Icon = stateIcon[key];
  const iconClass = monochrome ? "size-3.5" : `size-3.5 ${stateClass[key]}`;

  return <Icon aria-hidden="true" className={iconClass} />;
}

export function StateCell({
  label,
  state,
}: {
  label: string;
  monochrome?: boolean;
  state?: TicketState;
}) {
  return <TicketStateBadge label={label} state={state} />;
}

export function PriorityIcon({
  filled = true,
  monochrome = false,
  priority,
  sizeClassName = "size-3.5",
}: {
  filled?: boolean;
  monochrome?: boolean;
  priority?: TicketPriority;
  sizeClassName?: string;
}) {
  const key = priority ?? "unknown";
  const Icon = priorityIcon[key];
  const iconClass = monochrome
    ? sizeClassName
    : `${sizeClassName} ${filled ? "fill-current" : "fill-none"} ${priorityClass[key]}`;

  return <Icon aria-hidden="true" className={iconClass} />;
}

export function PriorityCell({
  label,
  monochrome = false,
  priority,
  variant = "inline",
}: {
  label: string;
  monochrome?: boolean;
  priority?: TicketPriority;
  variant?: "inline" | "pill";
}) {
  if (variant === "pill") {
    return (
      <span
        aria-label={`Ticket priority: ${label}`}
        className={`inline-flex h-5 min-w-0 shrink-0 items-center gap-1.5 rounded-md px-2 text-xs font-medium ${priorityPillClass[priority ?? "unknown"]}`}
      >
        <PriorityIcon
          monochrome={monochrome}
          priority={priority}
          sizeClassName="size-3"
        />
        <span className="truncate">{label}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <PriorityIcon monochrome={monochrome} priority={priority} />
      <span className="truncate">{label}</span>
    </span>
  );
}

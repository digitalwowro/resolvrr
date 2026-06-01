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
import type {
  StaticTicketPriority,
  StaticTicketState,
} from "../static-types";

const stateClass: Record<StaticTicketState, string> = {
  New: "text-rose-600",
  Open: "text-indigo-600",
  "Pending Reminder": "text-amber-600",
  "Pending Close": "text-violet-600",
  Closed: "text-emerald-600",
};

const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: CirclePlus,
  Open: Circle,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

const priorityClass: Record<StaticTicketPriority, string> = {
  Low: "text-emerald-600",
  Medium: "text-indigo-600",
  High: "text-rose-600",
};

const priorityIcon: Record<StaticTicketPriority, LucideIcon> = {
  Low: SignalLow,
  Medium: SignalMedium,
  High: SignalHigh,
};

export function StateCell({
  state,
  monochrome = false,
}: {
  state: StaticTicketState;
  monochrome?: boolean;
}) {
  const Icon = stateIcon[state];
  const iconClass = monochrome ? "size-3.5" : `size-3.5 ${stateClass[state]}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className={iconClass} />
      {state}
    </span>
  );
}

export function PriorityCell({
  priority,
  monochrome = false,
}: {
  priority: StaticTicketPriority;
  monochrome?: boolean;
}) {
  const Icon = priorityIcon[priority];
  const iconClass = monochrome
    ? "size-3.5"
    : `size-3.5 ${priorityClass[priority]}`;

  return (
    <span className="inline-flex items-center gap-1.5">
      <Icon aria-hidden="true" className={iconClass} />
      {priority}
    </span>
  );
}

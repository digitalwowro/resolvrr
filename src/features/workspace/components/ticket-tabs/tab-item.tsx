import {
  BriefcaseBusiness,
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  PauseCircle,
  List,
  type LucideIcon,
} from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { TicketState } from "@/core/tickets";
import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";

export const stateColor: Record<TicketState | "unknown", string> = {
  new: "text-rose-600",
  open: "text-indigo-600",
  pending_reminder: "text-amber-600",
  pending_close: "text-violet-600",
  closed: "text-emerald-600",
  unknown: "text-slate-500",
};

export const stateIcon: Record<TicketState | "unknown", LucideIcon> = {
  new: CirclePlus,
  open: Circle,
  pending_reminder: Clock3,
  pending_close: PauseCircle,
  closed: CheckCircle2,
  unknown: Circle,
};

export function ticketTabTooltip(tab: WorkspaceTicketTab) {
  return (
    <span className="block whitespace-nowrap">
      <span className="block">
        {tab.number} · <span className="font-semibold">{tab.title}</span> ·{" "}
        {tab.customer}
      </span>
      <span className="block">
        {tab.owner} · {tab.state} · {tab.priority}
      </span>
    </span>
  );
}

export function ListTab({
  active,
  onSelect,
  savedViewLabel,
}: {
  active: boolean;
  onSelect(): void;
  savedViewLabel: string;
}) {
  return (
    <Tooltip content={`Return to list: ${savedViewLabel}`} side="bottom">
      <button
        aria-label={`Return to list: ${savedViewLabel}`}
        aria-selected={active}
        className={cn(
          "relative inline-flex h-9 min-w-16 items-center justify-center gap-2 overflow-hidden rounded-md border bg-white px-3 text-slate-900",
          active
            ? "z-10 border-slate-300"
            : "border-slate-200 hover:border-slate-300 hover:bg-slate-50",
        )}
        onClick={onSelect}
        role="tab"
        type="button"
      >
        {active ? (
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-[3px] rounded-full bg-indigo-950"
          />
        ) : null}
        <List aria-hidden="true" className="size-3.5 shrink-0 text-slate-500" />
        <span>List</span>
      </button>
    </Tooltip>
  );
}

export function VerticalListTab({
  active,
  onSelect,
  savedViewLabel,
}: {
  active: boolean;
  onSelect(): void;
  savedViewLabel: string;
}) {
  return (
    <div className="shrink-0">
      <div
        className={cn(
          "flex h-12 w-full items-center gap-2 border-b px-3 text-white",
          active
            ? "border-indigo-700 bg-indigo-700"
            : "border-indigo-500 bg-indigo-500 hover:border-indigo-600 hover:bg-indigo-600",
        )}
      >
        <button
          aria-label={`Return to list: ${savedViewLabel}`}
          aria-selected={active}
          className={cn(
            "flex min-w-0 flex-1 items-center gap-2 rounded-md text-left",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
            "text-white hover:text-white",
          )}
          onClick={onSelect}
          role="tab"
          type="button"
        >
          <List aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="min-w-0 flex-1 truncate font-semibold">List</span>
          <span className="inline-flex min-w-0 max-w-24 items-center gap-1 truncate rounded-md border border-white px-1.5 py-0.5 text-xs text-white">
            <BriefcaseBusiness aria-hidden="true" className="size-3 shrink-0" />
            {savedViewLabel}
          </span>
        </button>
      </div>
    </div>
  );
}

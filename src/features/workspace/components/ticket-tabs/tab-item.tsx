import {
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
import type { TicketSelectableState } from "@/core/tickets";
import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";

export const stateColor: Record<TicketSelectableState | "unknown", string> = {
  new: "text-rose-600",
  open: "text-indigo-600",
  pending_reminder: "text-amber-600",
  pending_close: "text-violet-600",
  closed: "text-emerald-600",
  unknown: "text-slate-500",
};

export const stateIcon: Record<TicketSelectableState | "unknown", LucideIcon> = {
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
      <Tooltip
        className="w-full"
        content={`Return to list: ${savedViewLabel}`}
        side="bottom"
      >
        <button
          aria-label={`Return to list: ${savedViewLabel}`}
          aria-selected={active}
          className={cn(
            "relative flex min-h-14 w-full items-center gap-2 overflow-hidden rounded-md border border-slate-200 bg-white px-3 py-2 text-left text-slate-900",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
            active
              ? "z-10 border-slate-300"
              : "hover:border-slate-300 hover:bg-slate-50",
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
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold">List</span>
            <span className="mt-0.5 block truncate text-xs text-slate-500">
              {savedViewLabel}
            </span>
          </span>
        </button>
      </Tooltip>
    </div>
  );
}

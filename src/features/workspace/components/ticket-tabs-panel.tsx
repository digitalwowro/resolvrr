import {
  CheckCircle2,
  Circle,
  CircleDot,
  Clock3,
  PauseCircle,
  type LucideIcon,
} from "lucide-react";
import { TicketTab } from "@/components/ui";
import type {
  StaticTabOrientation,
  StaticTicketState,
  StaticTicketTab,
} from "../static-types";

type TicketTabsPanelProps = {
  tabs: StaticTicketTab[];
  activeTicketId: string;
  orientation: StaticTabOrientation;
  onSelect(ticketId: string): void;
};

const stateColor: Record<StaticTicketState, string> = {
  New: "text-sky-600",
  Open: "text-indigo-600",
  "Pending Reminder": "text-amber-600",
  "Pending Close": "text-violet-600",
  Closed: "text-emerald-600",
};

const stateIcon: Record<StaticTicketState, LucideIcon> = {
  New: Circle,
  Open: CircleDot,
  "Pending Reminder": Clock3,
  "Pending Close": PauseCircle,
  Closed: CheckCircle2,
};

function VerticalTicketTab({
  tab,
  active,
  onSelect,
}: {
  tab: StaticTicketTab;
  active: boolean;
  onSelect(): void;
}) {
  const Icon = stateIcon[tab.state];

  return (
    <button
      aria-selected={active}
      className={
        active
          ? "flex w-full items-start gap-2 border-l-2 border-indigo-500 bg-white px-3 py-2 text-left"
          : "flex w-full items-start gap-2 border-l-2 border-transparent px-3 py-2 text-left hover:bg-white"
      }
      onClick={onSelect}
      role="tab"
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={`mt-1 size-3.5 shrink-0 ${stateColor[tab.state]}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-slate-950">
          {tab.title}
        </span>
        <span className="mt-0.5 block truncate text-slate-500">
          {tab.label.split(" ")[0]} · {tab.customer}
        </span>
      </span>
    </button>
  );
}

export function TicketTabsPanel({
  tabs,
  activeTicketId,
  orientation,
  onSelect,
}: TicketTabsPanelProps) {
  if (orientation === "vertical") {
    return (
      <aside className="flex w-72 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
        <div className="flex h-10 shrink-0 items-center border-b border-slate-200 px-3 font-semibold text-slate-700">
          Open tickets
        </div>
        <div
          aria-label="Open tickets"
          className="flex min-h-0 flex-1 flex-col overflow-y-auto"
          role="tablist"
        >
          {tabs.map((tab) => (
            <VerticalTicketTab
              active={tab.id === activeTicketId}
              key={tab.id}
              onSelect={() => onSelect(tab.id)}
              tab={tab}
            />
          ))}
        </div>
      </aside>
    );
  }

  return (
    <div
      aria-label="Open tickets"
      className="flex min-w-0 shrink-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 pt-1.5"
      role="tablist"
    >
      {tabs.map((tab) => (
        <TicketTab
          active={tab.id === activeTicketId}
          dirty={tab.dirty}
          key={tab.id}
          label={tab.label}
          loading={tab.loading}
          onSelect={() => onSelect(tab.id)}
          unread={tab.unread}
        />
      ))}
    </div>
  );
}

import {
  CheckCircle2,
  Circle,
  CirclePlus,
  Clock3,
  PauseCircle,
  X,
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
          ? "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 border-l-indigo-500 bg-white px-3 py-2 text-left"
          : "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 border-l-transparent px-3 py-2 text-left hover:bg-white"
      }
      onClick={onSelect}
      role="tab"
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={`self-center size-3.5 shrink-0 ${stateColor[tab.state]}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {tab.title}
        </span>
        <span className="mt-0.5 block truncate text-xs">
          {tab.label.split(" ")[0]} · {tab.customer}
        </span>
      </span>
      <span
        aria-label={`Close ${tab.label}`}
        className="grid size-5 shrink-0 place-items-center self-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
      >
        <X aria-hidden="true" className="size-3" />
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
      <aside className="flex min-w-64 max-w-xs basis-1/6 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
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
      className="flex min-w-0 shrink-0 gap-1 bg-slate-50"
      role="tablist"
    >
      {tabs.map((tab) => {
        const Icon = stateIcon[tab.state];

        return (
          <TicketTab
            active={tab.id === activeTicketId}
            dirty={tab.dirty}
            icon={
              <Icon
                aria-hidden="true"
                className={`size-3.5 shrink-0 ${stateColor[tab.state]}`}
              />
            }
            key={tab.id}
            label={tab.label.split(" ")[0]}
            loading={tab.loading}
            onClose={() => undefined}
            onSelect={() => onSelect(tab.id)}
            title={tab.title}
            unread={tab.unread}
          />
        );
      })}
    </div>
  );
}

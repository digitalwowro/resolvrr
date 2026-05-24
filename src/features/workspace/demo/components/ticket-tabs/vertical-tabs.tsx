import { X } from "lucide-react";
import { Tooltip } from "@/components/ui";
import type { StaticTicketTab } from "../../static-types";
import { VerticalListTab } from "./list-tabs";
import { stateColor, stateIcon } from "./tab-style";

type VerticalTicketTabsProps = {
  tabs: StaticTicketTab[];
  activeTicketId?: string;
  listActive: boolean;
  savedViewLabel: string;
  onSelectList(): void;
  onSelect(ticketId: string): void;
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
          ? "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 border-l-indigo-600 bg-indigo-50 px-3 py-2 text-left"
          : "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 border-l-transparent bg-white px-3 py-2 text-left hover:bg-slate-50"
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
      <Tooltip className="self-center" content={`Close ${tab.label}`}>
        <span
          aria-label={`Close ${tab.label}`}
          className="grid size-5 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          <X aria-hidden="true" className="size-3" />
        </span>
      </Tooltip>
    </button>
  );
}

export function VerticalTicketTabs({
  tabs,
  activeTicketId,
  listActive,
  savedViewLabel,
  onSelectList,
  onSelect,
}: VerticalTicketTabsProps) {
  return (
    <aside className="flex min-w-64 max-w-xs basis-1/6 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div
        aria-label="Open tickets"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        role="tablist"
      >
        <VerticalListTab
          active={listActive}
          onSelect={onSelectList}
          savedViewLabel={savedViewLabel}
        />
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

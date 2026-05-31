import { X } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import {
  stateColor,
  stateIcon,
  VerticalListTab,
} from "./tab-item";

type VerticalTicketTabsProps = {
  activeTicketId?: string;
  columns: WorkspaceTicketColumn[];
  listActive: boolean;
  onColumnToggle(column: WorkspaceTicketColumnKey): void;
  onSelectList(): void;
  onSelectTicket(ticketId: string): void;
  onCloseTicket(ticketId: string): void;
  onRefresh(): void;
  savedViewLabel: string;
  tabs: WorkspaceTicketTab[];
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

function VerticalTicketTab({
  active,
  onClose,
  onSelect,
  tab,
}: {
  active: boolean;
  onClose(): void;
  onSelect(): void;
  tab: WorkspaceTicketTab;
}) {
  const key = tab.stateKey ?? "unknown";
  const Icon = stateIcon[key];

  return (
    <button
      aria-selected={active}
      className={cn(
        "flex w-full items-start gap-2 border-b border-l-2 border-b-slate-200 px-3 py-2 text-left",
        active
          ? "border-l-indigo-600 bg-indigo-50"
          : "border-l-transparent bg-white hover:bg-slate-50",
      )}
      onClick={onSelect}
      role="tab"
      type="button"
    >
      <Icon
        aria-hidden="true"
        className={`self-center size-3.5 shrink-0 ${stateColor[key]}`}
      />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">{tab.title}</span>
        <span className="mt-0.5 block truncate text-xs">
          {tab.number} · {tab.customer}
        </span>
      </span>
      <Tooltip className="self-center" content={`Close ${tab.number}`}>
        <span
          aria-label={`Close ${tab.number}`}
          className="grid size-5 shrink-0 place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              event.stopPropagation();
              onClose();
            }
          }}
          role="button"
          tabIndex={0}
        >
          <X aria-hidden="true" className="size-3" />
        </span>
      </Tooltip>
    </button>
  );
}

export function VerticalTicketTabs({
  activeTicketId,
  columns,
  listActive,
  onColumnToggle,
  onSelectList,
  onSelectTicket,
  onCloseTicket,
  onRefresh,
  savedViewLabel,
  tabs,
  visibleColumns,
}: VerticalTicketTabsProps) {
  return (
    <aside
      className="flex min-w-64 max-w-xs basis-1/6 shrink-0 flex-col border-r border-slate-200 bg-white"
    >
      <div
        aria-label="Open tickets"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
        role="tablist"
      >
        <VerticalListTab
          active={listActive}
          columns={columns}
          onColumnToggle={onColumnToggle}
          onRefresh={onRefresh}
          onSelect={onSelectList}
          savedViewLabel={savedViewLabel}
          visibleColumns={visibleColumns}
        />
        {tabs.map((tab) => (
          <VerticalTicketTab
            active={tab.id === activeTicketId}
            key={tab.id}
            onClose={() => onCloseTicket(tab.id)}
            onSelect={() => onSelectTicket(tab.id)}
            tab={tab}
          />
        ))}
      </div>
    </aside>
  );
}

import { TicketTab } from "@/components/ui";
import type { StaticTabOrientation, StaticTicketTab } from "../static-types";

type TicketTabsPanelProps = {
  tabs: StaticTicketTab[];
  activeTicketId: string;
  orientation: StaticTabOrientation;
  onSelect(ticketId: string): void;
};

export function TicketTabsPanel({
  tabs,
  activeTicketId,
  orientation,
  onSelect,
}: TicketTabsPanelProps) {
  const vertical = orientation === "vertical";

  return (
    <div
      aria-label="Open tickets"
      className={
        vertical
          ? "flex w-44 shrink-0 flex-col gap-1 border-r border-slate-200 bg-slate-50 p-1.5"
          : "flex min-w-0 gap-1 overflow-x-auto border-b border-slate-200 bg-slate-50 px-2 pt-1.5"
      }
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

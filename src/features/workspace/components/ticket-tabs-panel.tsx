import type { WorkspaceTicketTab } from "@/features/tickets";
import { HorizontalTicketTabs } from "./ticket-tabs/horizontal-ticket-tabs";
import { VerticalTicketTabs } from "./ticket-tabs/vertical-ticket-tabs";

export type TicketTabOrientation = "horizontal" | "vertical";

type TicketTabsPanelProps = {
  activeTicketId?: string;
  listActive: boolean;
  onCloseTicket(ticketId: string): void;
  onSelectList(): void;
  onSelectTicket(ticketId: string): void;
  orientation?: TicketTabOrientation;
  savedViewLabel: string;
  tabs: WorkspaceTicketTab[];
};

export function TicketTabsPanel({
  activeTicketId,
  listActive,
  onCloseTicket,
  onSelectList,
  onSelectTicket,
  orientation = "horizontal",
  savedViewLabel,
  tabs,
}: TicketTabsPanelProps) {
  if (orientation === "vertical") {
    return (
      <VerticalTicketTabs
        activeTicketId={activeTicketId}
        listActive={listActive}
        onCloseTicket={onCloseTicket}
        onSelectList={onSelectList}
        onSelectTicket={onSelectTicket}
        savedViewLabel={savedViewLabel}
        tabs={tabs}
      />
    );
  }

  return (
    <HorizontalTicketTabs
      activeTicketId={activeTicketId}
      listActive={listActive}
      onCloseTicket={onCloseTicket}
      onSelectList={onSelectList}
      onSelectTicket={onSelectTicket}
      savedViewLabel={savedViewLabel}
      tabs={tabs}
    />
  );
}

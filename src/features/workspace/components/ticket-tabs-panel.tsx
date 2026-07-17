import type {
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { HorizontalTicketTabs } from "./ticket-tabs/horizontal-ticket-tabs";
import { VerticalTicketTabs } from "./ticket-tabs/vertical-ticket-tabs";

export type TicketTabOrientation = "horizontal" | "vertical";

type TicketTabsPanelProps = {
  activeTicketId?: string;
  listActive: boolean;
  onCloseTicket(ticketId: string): void;
  onReorderTicket(sourceTicketId: string, targetIndex: number): void;
  onSelectList(): void;
  onSelectTicket(ticketId: string): void;
  orientation?: TicketTabOrientation;
  savedViewLabel: string;
  tabs: WorkspaceTicketTab[];
  unsynchronizedTicketIds?: string[];
};

export function TicketTabsPanel({
  activeTicketId,
  listActive,
  onCloseTicket,
  onReorderTicket,
  onSelectList,
  onSelectTicket,
  orientation = "horizontal",
  savedViewLabel,
  tabs,
  unsynchronizedTicketIds = [],
}: TicketTabsPanelProps) {
  if (orientation === "vertical") {
    return (
      <VerticalTicketTabs
        activeTicketId={activeTicketId}
        listActive={listActive}
        onCloseTicket={onCloseTicket}
        onReorderTicket={onReorderTicket}
        onSelectList={onSelectList}
        onSelectTicket={onSelectTicket}
        savedViewLabel={savedViewLabel}
        tabs={tabs}
        unsynchronizedTicketIds={unsynchronizedTicketIds}
      />
    );
  }

  return (
    <HorizontalTicketTabs
      activeTicketId={activeTicketId}
      listActive={listActive}
      onCloseTicket={onCloseTicket}
      onReorderTicket={onReorderTicket}
      onSelectList={onSelectList}
      onSelectTicket={onSelectTicket}
      savedViewLabel={savedViewLabel}
      tabs={tabs}
      unsynchronizedTicketIds={unsynchronizedTicketIds}
    />
  );
}

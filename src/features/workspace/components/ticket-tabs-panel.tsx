import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { HorizontalTicketTabs } from "./ticket-tabs/horizontal-ticket-tabs";
import { VerticalTicketTabs } from "./ticket-tabs/vertical-ticket-tabs";

export type TicketTabOrientation = "horizontal" | "vertical";

type TicketTabsPanelProps = {
  activeTicketId?: string;
  columns: WorkspaceTicketColumn[];
  listActive: boolean;
  onCloseTicket(ticketId: string): void;
  onColumnToggle(column: WorkspaceTicketColumnKey): void;
  onRefresh(): void;
  onSelectList(): void;
  onSelectTicket(ticketId: string): void;
  orientation?: TicketTabOrientation;
  savedViewLabel: string;
  tabs: WorkspaceTicketTab[];
  visibleColumns: Set<WorkspaceTicketColumnKey>;
};

export function TicketTabsPanel({
  activeTicketId,
  columns,
  listActive,
  onCloseTicket,
  onColumnToggle,
  onRefresh,
  onSelectList,
  onSelectTicket,
  orientation = "horizontal",
  savedViewLabel,
  tabs,
  visibleColumns,
}: TicketTabsPanelProps) {
  if (orientation === "vertical") {
    return (
      <VerticalTicketTabs
        activeTicketId={activeTicketId}
        columns={columns}
        listActive={listActive}
        onCloseTicket={onCloseTicket}
        onColumnToggle={onColumnToggle}
        onRefresh={onRefresh}
        onSelectList={onSelectList}
        onSelectTicket={onSelectTicket}
        savedViewLabel={savedViewLabel}
        tabs={tabs}
        visibleColumns={visibleColumns}
      />
    );
  }

  return (
    <HorizontalTicketTabs
      activeTicketId={activeTicketId}
      columns={columns}
      listActive={listActive}
      onCloseTicket={onCloseTicket}
      onColumnToggle={onColumnToggle}
      onRefresh={onRefresh}
      onSelectList={onSelectList}
      onSelectTicket={onSelectTicket}
      savedViewLabel={savedViewLabel}
      tabs={tabs}
      visibleColumns={visibleColumns}
    />
  );
}

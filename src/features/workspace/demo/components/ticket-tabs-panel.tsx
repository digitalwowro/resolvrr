"use client";

import type {
  StaticTabOrientation,
  StaticTicketTab,
} from "../static-types";
import { HorizontalTicketTabs } from "./ticket-tabs/horizontal-tabs";
import { VerticalTicketTabs } from "./ticket-tabs/vertical-tabs";

type TicketTabsPanelProps = {
  tabs: StaticTicketTab[];
  activeTicketId?: string;
  listActive: boolean;
  orientation: StaticTabOrientation;
  savedViewLabel: string;
  onSelectList(): void;
  onSelect(ticketId: string): void;
};

export function TicketTabsPanel({
  tabs,
  activeTicketId,
  listActive,
  orientation,
  savedViewLabel,
  onSelectList,
  onSelect,
}: TicketTabsPanelProps) {
  if (orientation === "vertical") {
    return (
      <VerticalTicketTabs
        activeTicketId={activeTicketId}
        listActive={listActive}
        onSelect={onSelect}
        onSelectList={onSelectList}
        savedViewLabel={savedViewLabel}
        tabs={tabs}
      />
    );
  }

  return (
    <HorizontalTicketTabs
      activeTicketId={activeTicketId}
      listActive={listActive}
      onSelect={onSelect}
      onSelectList={onSelectList}
      savedViewLabel={savedViewLabel}
      tabs={tabs}
    />
  );
}

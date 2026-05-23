"use client";

import { useMemo, useState } from "react";
import {
  useTableSort,
  type DropdownOption,
  type SortDirection,
} from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import {
  staticColumns,
  staticProfileActions,
  staticProfileWorkspaces,
  staticSavedViews,
  staticTabOrientations,
  staticTicketRows,
  staticTicketTabs,
} from "../static-fixtures";
import type {
  StaticColumnKey,
  StaticSortKey,
  StaticTabOrientation,
  StaticTicketPriority,
  StaticTicketRow,
} from "../static-types";
import { TicketTable } from "./ticket-table";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import { WorkspaceControls } from "./workspace-controls";
import { WorkspaceHeader } from "./workspace-header";

type StaticWorkspaceProps = {
  userEmail: string;
};

type ActiveContext =
  | { type: "list" }
  | { type: "ticket"; ticketId: string };

const priorityRank: Record<StaticTicketPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

const defaultVisibleColumns = new Set<StaticColumnKey>([
  "customer",
  "owner",
  "state",
  "priority",
  "pendingTill",
  "updatedAt",
]);

function dropdownOptions(
  values: Array<{ id?: string; value?: string; label: string }>,
): DropdownOption[] {
  return values.map((value) => ({
    value: value.id ?? value.value ?? value.label,
    label: value.label,
  }));
}

function sortRows(
  rows: StaticTicketRow[],
  sortKey: StaticSortKey,
  direction: SortDirection,
) {
  const sign = direction === "ascending" ? 1 : -1;

  return [...rows].sort((first, second) => {
    if (sortKey === "priority") {
      return (priorityRank[first.priority] - priorityRank[second.priority]) * sign;
    }

    const firstValue = first[sortKey];
    const secondValue = second[sortKey];
    return firstValue.localeCompare(secondValue) * sign;
  });
}

function TicketDetailPlaceholder({
  roundedTop,
  ticket,
}: {
  roundedTop: boolean;
  ticket: StaticTicketRow;
}) {
  return (
    <section
      aria-label={`Ticket detail ${ticket.number}`}
      className={cn(
        "min-h-0 flex-1 overflow-hidden border-x border-t border-slate-200 bg-white",
        roundedTop && "rounded-t-md",
      )}
    >
      <div className="border-b border-slate-200 px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="shrink-0">{ticket.number}</span>
          <h2 className="min-w-0 flex-1 truncate font-semibold">{ticket.title}</h2>
          <span className="shrink-0 text-xs">{ticket.customer}</span>
        </div>
      </div>
      <div className="flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1 space-y-3 overflow-auto px-4 py-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
            {ticket.preview}
          </div>
          <div className="rounded-md border border-slate-200 px-3 py-2">
            Static ticket detail placeholder for layout review.
          </div>
        </div>
        <div className="flex h-11 shrink-0 items-center gap-4 border-t border-slate-200 px-4 text-sm">
          <span>Owner {ticket.owner}</span>
          <span>State {ticket.state}</span>
          <span>Priority {ticket.priority}</span>
          <span>Group Support</span>
        </div>
      </div>
    </section>
  );
}

export function StaticWorkspace({ userEmail }: StaticWorkspaceProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    staticProfileWorkspaces[0].id,
  );
  const [selectedSavedViewId, setSelectedSavedViewId] = useState(
    staticSavedViews[0].id,
  );
  const [tabOrientation, setTabOrientation] =
    useState<StaticTabOrientation>("horizontal");
  const [activeContext, setActiveContext] = useState<ActiveContext>({
    type: "list",
  });
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const { sortDirection, sortDirectionFor, sortKey, toggleSort } =
    useTableSort<StaticSortKey>({
      initialSortKey: "updatedAt",
      initialSortDirection: "descending",
    });

  const rows = useMemo(
    () => sortRows(staticTicketRows, sortKey, sortDirection),
    [sortDirection, sortKey],
  );
  const savedViewOptions = dropdownOptions(staticSavedViews);
  const selectedSavedView =
    staticSavedViews.find((view) => view.id === selectedSavedViewId) ??
    staticSavedViews[0];
  const orientationOptions = dropdownOptions(staticTabOrientations);
  const allSelected = rows.length > 0 && selectedRowIds.size === rows.length;
  const partiallySelected = selectedRowIds.size > 0 && !allSelected;
  const activeTicket =
    activeContext.type === "ticket"
      ? rows.find((row) => row.id === activeContext.ticketId) ?? staticTicketRows[0]
      : staticTicketRows[0];

  function toggleSelectAll() {
    setSelectedRowIds(allSelected ? new Set() : new Set(rows.map((row) => row.id)));
  }

  function toggleRow(ticketId: string) {
    setSelectedRowIds((current) => {
      const next = new Set(current);
      if (next.has(ticketId)) {
        next.delete(ticketId);
      } else {
        next.add(ticketId);
      }
      return next;
    });
  }

  function toggleColumn(column: StaticColumnKey) {
    setVisibleColumns((current) => {
      const next = new Set(current);
      if (next.has(column)) {
        next.delete(column);
      } else {
        next.add(column);
      }
      return next;
    });
  }

  function handleRefresh() {
    setSelectedRowIds(new Set());
  }

  function handleSavedViewChange(savedViewId: string) {
    setSelectedSavedViewId(savedViewId);
    setActiveContext({ type: "list" });
  }

  function showTicket(ticketId: string) {
    setActiveContext({ type: "ticket", ticketId });
  }

  function controls(className?: string) {
    return (
    <WorkspaceControls
      allSelected={allSelected}
      className={className}
      columns={staticColumns}
      onColumnToggle={toggleColumn}
      onRefresh={handleRefresh}
      onSavedViewChange={handleSavedViewChange}
      onSelectAll={toggleSelectAll}
      onTabOrientationChange={setTabOrientation}
      orientationOptions={orientationOptions}
      partiallySelected={partiallySelected}
      savedViewOptions={savedViewOptions}
      selectedSavedViewId={selectedSavedViewId}
      tabOrientation={tabOrientation}
      visibleColumns={visibleColumns}
    />
    );
  }

  const tabs = (
    <TicketTabsPanel
      activeTicketId={
        activeContext.type === "ticket" ? activeContext.ticketId : undefined
      }
      listActive={activeContext.type === "list"}
      onSelect={showTicket}
      onSelectList={() => setActiveContext({ type: "list" })}
      orientation={tabOrientation}
      savedViewLabel={selectedSavedView.label}
      tabs={staticTicketTabs}
    />
  );

  const table = (
    <TicketTable
      activeTicketId={
        activeContext.type === "ticket" ? activeContext.ticketId : ""
      }
      onRowSelect={showTicket}
      onSort={toggleSort}
      onToggleRow={toggleRow}
      roundedTop={tabOrientation === "vertical"}
      rows={rows}
      selectedRowIds={selectedRowIds}
      sortDirectionFor={sortDirectionFor}
      visibleColumns={visibleColumns}
    />
  );

  const workArea =
    activeContext.type === "list" ? (
      table
    ) : (
      <TicketDetailPlaceholder
        roundedTop={tabOrientation === "vertical"}
        ticket={activeTicket}
      />
    );

  return (
    <main className="flex h-screen min-h-screen flex-col overflow-hidden">
      <WorkspaceHeader
        actions={staticProfileActions}
        onWorkspaceChange={setSelectedWorkspaceId}
        selectedWorkspaceId={selectedWorkspaceId}
        userEmail={userEmail}
        workspaces={staticProfileWorkspaces}
      />
      {tabOrientation === "vertical" ? (
        <section className="flex min-h-0 flex-1 overflow-hidden">
          {tabs}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden px-4">
            {controls()}
            {workArea}
          </div>
        </section>
      ) : (
        <>
          {controls("px-4")}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
            {tabs}
            {workArea}
          </section>
        </>
      )}
    </main>
  );
}

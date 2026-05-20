"use client";

import { useMemo, useState } from "react";
import type { DropdownOption, SortDirection } from "@/components/ui";
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

export function StaticWorkspace({ userEmail }: StaticWorkspaceProps) {
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(
    staticProfileWorkspaces[0].id,
  );
  const [selectedSavedViewId, setSelectedSavedViewId] = useState(
    staticSavedViews[0].id,
  );
  const [tabOrientation, setTabOrientation] =
    useState<StaticTabOrientation>("horizontal");
  const [activeTicketId, setActiveTicketId] = useState(staticTicketTabs[0].id);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const [sortKey, setSortKey] = useState<StaticSortKey>("updatedAt");
  const [sortDirection, setSortDirection] = useState<SortDirection>("descending");

  const rows = useMemo(
    () => sortRows(staticTicketRows, sortKey, sortDirection),
    [sortDirection, sortKey],
  );
  const savedViewOptions = dropdownOptions(staticSavedViews);
  const orientationOptions = dropdownOptions(staticTabOrientations);
  const allSelected = rows.length > 0 && selectedRowIds.size === rows.length;
  const partiallySelected = selectedRowIds.size > 0 && !allSelected;

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

  function handleSort(key: StaticSortKey) {
    if (key === sortKey) {
      setSortDirection((current) =>
        current === "ascending" ? "descending" : "ascending",
      );
      return;
    }

    setSortKey(key);
    setSortDirection("ascending");
  }

  function handleRefresh() {
    setSelectedRowIds(new Set());
  }

  const controls = (
    <WorkspaceControls
      allSelected={allSelected}
      columns={staticColumns}
      onColumnToggle={toggleColumn}
      onRefresh={handleRefresh}
      onSavedViewChange={setSelectedSavedViewId}
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

  const tabs = (
    <TicketTabsPanel
      activeTicketId={activeTicketId}
      onSelect={setActiveTicketId}
      orientation={tabOrientation}
      tabs={staticTicketTabs}
    />
  );

  const table = (
    <TicketTable
      activeTicketId={activeTicketId}
      onRowSelect={setActiveTicketId}
      onSort={handleSort}
      onToggleRow={toggleRow}
      rows={rows}
      selectedRowIds={selectedRowIds}
      sortDirection={sortDirection}
      sortKey={sortKey}
      visibleColumns={visibleColumns}
    />
  );

  return (
    <main className="flex min-h-screen flex-col">
      <WorkspaceHeader
        actions={staticProfileActions}
        onWorkspaceChange={setSelectedWorkspaceId}
        selectedWorkspaceId={selectedWorkspaceId}
        userEmail={userEmail}
        workspaces={staticProfileWorkspaces}
      />
      {tabOrientation === "vertical" ? (
        <section className="flex min-h-0 flex-1 overflow-hidden bg-white px-5 pb-5">
          {tabs}
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {controls}
            {table}
          </div>
        </section>
      ) : (
        <>
          {controls}
          <section className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white px-5 pb-5">
            {tabs}
            {table}
          </section>
        </>
      )}
    </main>
  );
}

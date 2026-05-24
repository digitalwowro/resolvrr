"use client";

import { useMemo, useState } from "react";
import { useTableSort, type DropdownOption } from "@/components/ui";
import {
  staticColumns,
  staticProfileActions,
  staticProfileWorkspaces,
  staticSavedViews,
  staticTabOrientations,
  staticTicketRows,
  staticTicketTabs,
} from "./static-fixtures";
import type {
  StaticColumnKey,
  StaticSortKey,
  StaticTabOrientation,
  StaticTicketGroupKey,
} from "./static-types";
import { TicketTable } from "./components/ticket-table";
import {
  groupTicketRows,
  ticketGroupOptions,
} from "./components/ticket-table-grouping";
import { TicketDetailPlaceholder } from "./components/ticket-detail-placeholder";
import { TicketTabsPanel } from "./components/ticket-tabs-panel";
import { WorkspaceControls } from "./components/workspace-controls";
import { WorkspaceHeader } from "./components/workspace-header";

type StaticWorkspaceProps = {
  userEmail: string;
};

type ActiveContext = { type: "list" } | { type: "ticket"; ticketId: string };

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
  const [groupBy, setGroupBy] = useState<StaticTicketGroupKey>("none");
  const { setSort, sortDirection, sortDirectionFor, sortKey, toggleSort } =
    useTableSort<StaticSortKey>({
      initialSortKey: "updatedAt",
      initialSortDirection: "descending",
    });

  const groupedRows = useMemo(
    () => groupTicketRows(staticTicketRows, groupBy, sortKey, sortDirection),
    [groupBy, sortDirection, sortKey],
  );
  const rows = useMemo(
    () => groupedRows.flatMap((group) => group.rows),
    [groupedRows],
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

  function handleGroupByChange(nextGroupBy: StaticTicketGroupKey) {
    setGroupBy(nextGroupBy);
    if (nextGroupBy !== "none" && nextGroupBy === sortKey) {
      setSort("updatedAt", "descending");
    }
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
        groupBy={groupBy}
        groupOptions={ticketGroupOptions}
        onColumnToggle={toggleColumn}
        onGroupByChange={handleGroupByChange}
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
      groupBy={groupBy}
      groupedRows={groupBy === "none" ? undefined : groupedRows}
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

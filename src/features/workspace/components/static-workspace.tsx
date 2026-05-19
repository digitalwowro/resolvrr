"use client";

import { useMemo, useState } from "react";
import type { DropdownOption, SortDirection } from "@/components/ui";
import {
  staticColumns,
  staticProfileActions,
  staticProfileWorkspaces,
  staticSavedViews,
  staticStateVariants,
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
  StaticWorkspaceVariant,
} from "../static-types";
import { SelectedTicketPreview } from "./selected-ticket-preview";
import { TicketTable } from "./ticket-table";
import { TicketTabsPanel } from "./ticket-tabs-panel";
import { WorkspaceControls } from "./workspace-controls";
import { WorkspaceHeader } from "./workspace-header";
import { WorkspaceStatePanel } from "./workspace-state-panel";

type StaticWorkspaceProps = {
  userEmail: string;
};

const priorityRank: Record<StaticTicketPriority, number> = {
  urgent: 4,
  high: 3,
  normal: 2,
  low: 1,
};

const defaultVisibleColumns = new Set<StaticColumnKey>([
  "requester",
  "state",
  "priority",
  "assignee",
  "updated",
  "sla",
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

    const firstValue = sortKey === "ticket" ? first.ticketNumber : first[sortKey];
    const secondValue = sortKey === "ticket" ? second.ticketNumber : second[sortKey];
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
  const [previewState, setPreviewState] = useState<StaticWorkspaceVariant>("ready");
  const [activeTicketId, setActiveTicketId] = useState(staticTicketTabs[0].id);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(defaultVisibleColumns);
  const [sortKey, setSortKey] = useState<StaticSortKey>("updated");
  const [sortDirection, setSortDirection] = useState<SortDirection>("descending");

  const rows = useMemo(
    () => (previewState === "ready" ? sortRows(staticTicketRows, sortKey, sortDirection) : []),
    [previewState, sortDirection, sortKey],
  );
  const activeTicket =
    staticTicketRows.find((row) => row.id === activeTicketId) ?? staticTicketRows[0];
  const stateVariant =
    staticStateVariants.find((variant) => variant.id === previewState) ??
    staticStateVariants[0];
  const savedViewOptions = dropdownOptions(staticSavedViews);
  const orientationOptions = dropdownOptions(staticTabOrientations);
  const stateOptions = dropdownOptions(staticStateVariants);
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
    setPreviewState("loading");
  }

  function handlePreviewStateChange(state: StaticWorkspaceVariant) {
    if (state !== "ready") {
      setSelectedRowIds(new Set());
    }
    setPreviewState(state);
  }

  return (
    <main className="flex min-h-screen flex-col bg-slate-100 text-slate-950">
      <WorkspaceHeader
        actions={staticProfileActions}
        onWorkspaceChange={setSelectedWorkspaceId}
        selectedWorkspaceId={selectedWorkspaceId}
        userEmail={userEmail}
        workspaces={staticProfileWorkspaces}
      />
      <WorkspaceControls
        allSelected={allSelected}
        columns={staticColumns}
        onColumnToggle={toggleColumn}
        onPreviewStateChange={handlePreviewStateChange}
        onRefresh={handleRefresh}
        onSavedViewChange={setSelectedSavedViewId}
        onSelectAll={toggleSelectAll}
        onTabOrientationChange={setTabOrientation}
        orientationOptions={orientationOptions}
        partiallySelected={partiallySelected}
        previewState={previewState}
        rowCount={rows.length}
        savedViewOptions={savedViewOptions}
        selectedCount={selectedRowIds.size}
        selectedSavedViewId={selectedSavedViewId}
        stateOptions={stateOptions}
        tabOrientation={tabOrientation}
        visibleColumns={visibleColumns}
      />
      <section
        className={
          tabOrientation === "vertical"
            ? "flex min-h-0 flex-1 overflow-hidden"
            : "flex min-h-0 flex-1 flex-col overflow-hidden"
        }
      >
        <TicketTabsPanel
          activeTicketId={activeTicketId}
          onSelect={setActiveTicketId}
          orientation={tabOrientation}
          tabs={staticTicketTabs}
        />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="min-w-0 flex-1">
            {previewState === "ready" ? (
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
            ) : (
              <WorkspaceStatePanel variant={stateVariant} />
            )}
          </div>
          {previewState === "ready" ? (
            <SelectedTicketPreview ticket={activeTicket} />
          ) : null}
        </div>
      </section>
    </main>
  );
}

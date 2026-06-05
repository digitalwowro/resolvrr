"use client";

import { useMemo, useState } from "react";
import { useTableSort } from "@/components/ui";
import type { WorkspaceTicketListSort } from "@/features/tickets/list-page-action-result";
import type {
  WorkspaceTicketColumn,
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
  WorkspaceTicketSortKey,
} from "@/features/tickets/workspace-adapter";
import {
  groupTicketRows,
  sortTicketRows,
} from "./ticket-table-grouping";

type UseTicketWorkspaceTableStateOptions = {
  columns: WorkspaceTicketColumn[];
  localSortEnabled: boolean;
  onProviderSortChange(sort: WorkspaceTicketListSort): void;
  providerSortEnabled: boolean;
  rows: WorkspaceTicketRow[];
};

export function useTicketWorkspaceTableState({
  columns,
  localSortEnabled,
  onProviderSortChange,
  providerSortEnabled,
  rows,
}: UseTicketWorkspaceTableStateOptions) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [visibleColumns, setVisibleColumns] = useState(
    () => new Set(columns.map((column) => column.key)),
  );
  const [groupBy, setGroupBy] = useState<WorkspaceTicketGroupKey>("none");
  const { setSort, sortDirection, sortDirectionFor, sortKey } =
    useTableSort<WorkspaceTicketSortKey>({
      initialSortKey: "updatedAt",
      initialSortDirection: "descending",
    });

  const groupedRows = useMemo(
    () => groupTicketRows(rows, groupBy, sortKey, sortDirection),
    [groupBy, rows, sortDirection, sortKey],
  );
  const sortedRows = useMemo(() => {
    if (groupBy !== "none") {
      return groupedRows.flatMap((group) => group.rows);
    }
    if (providerSortEnabled || !localSortEnabled) {
      return rows;
    }
    return sortTicketRows(rows, sortKey, sortDirection);
  }, [
    groupBy,
    groupedRows,
    localSortEnabled,
    providerSortEnabled,
    rows,
    sortDirection,
    sortKey,
  ]);
  const allSelected =
    sortedRows.length > 0 && selectedRowIds.size === sortedRows.length;
  const partiallySelected = selectedRowIds.size > 0 && !allSelected;
  const visibleColumnSet = useMemo(
    () => new Set<WorkspaceTicketColumnKey>(visibleColumns),
    [visibleColumns],
  );

  function toggleSelectAll() {
    setSelectedRowIds(
      allSelected ? new Set() : new Set(sortedRows.map((row) => row.id)),
    );
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

  function toggleColumn(column: WorkspaceTicketColumnKey) {
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

  function nextSortDirection(key: WorkspaceTicketSortKey) {
    return key === sortKey && sortDirection === "ascending"
      ? "descending"
      : "ascending";
  }

  function toggleSort(key: WorkspaceTicketSortKey) {
    const direction = nextSortDirection(key);
    setSort(key, direction);
    if (providerSortEnabled && groupBy === "none") {
      onProviderSortChange({ key, direction });
    }
  }

  function handleGroupByChange(nextGroupBy: WorkspaceTicketGroupKey) {
    setGroupBy(nextGroupBy);
    if (nextGroupBy !== "none" && nextGroupBy === sortKey) {
      setSort("updatedAt", "descending");
    }
  }

  function clearRowSelection() {
    setSelectedRowIds(new Set());
  }

  return {
    allSelected,
    clearRowSelection,
    groupBy,
    groupedRows,
    handleGroupByChange,
    partiallySelected,
    selectedRowIds,
    sortDirectionFor,
    sortingEnabled: providerSortEnabled || localSortEnabled,
    sortedRows,
    toggleColumn,
    toggleRow,
    toggleSelectAll,
    toggleSort,
    visibleColumnSet,
  };
}

"use client";

import { useMemo, useState } from "react";
import { useTableSort } from "@/components/ui";
import type {
  WorkspaceTicketColumnKey,
  WorkspaceTicketGroupKey,
  WorkspaceTicketSortKey,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import type { TicketMetadataSavedPatch } from "./metadata-draft";
import {
  groupTicketRows,
  sortTicketRows,
} from "./ticket-table-grouping";
import { patchTicketTabMetadata } from "./ticket-tab-metadata";
import type { TicketTabOrientation } from "./ticket-tabs-panel";
import type {
  ActiveWorkspacePane,
  TicketWorkspaceStateProps,
} from "./ticket-workspace-state-types";
import { useTicketDetailLoader } from "./use-ticket-detail-loader";
import { replaceWorkspaceUrl } from "./workspace-url";

export function useTicketWorkspaceDisplayState({
  columns,
  detail,
  detailResult,
  loadTicketDetailAction,
  localSortEnabled,
  onProviderSortChange,
  providerSortEnabled,
  refreshTicketDetailAfterMetadataSave,
  rows,
  selectedTicketId,
  ticketTabs,
}: TicketWorkspaceStateProps) {
  const initialDetailResult = useMemo(
    () => (detail ? { status: "available" as const, detail } : detailResult),
    [detail, detailResult],
  );
  const {
    cacheSelectedDetail,
    detailFor,
    ensureTicketDetail,
    refreshTicketDetail,
  } = useTicketDetailLoader({
    initialDetailResult,
    loadTicketDetailAction,
    selectedTicketId,
  });
  const [tabOrientation, setTabOrientation] =
    useState<TicketTabOrientation>("horizontal");
  const [activeWorkspacePane, setActiveWorkspacePane] =
    useState<ActiveWorkspacePane>(
      selectedTicketId ? { ticketId: selectedTicketId } : "list",
    );
  const [openTicketTabs, setOpenTicketTabs] = useState<WorkspaceTicketTab[]>(
    () => {
      const selectedTab = selectedTicketId
        ? ticketTabs.find((tab) => tab.id === selectedTicketId)
        : undefined;
      return selectedTab ? [selectedTab] : [];
    },
  );
  const [recentTicketTabs, setRecentTicketTabs] = useState<WorkspaceTicketTab[]>(
    () => {
      const selectedTab = selectedTicketId
        ? ticketTabs.find((tab) => tab.id === selectedTicketId)
        : undefined;
      return selectedTab ? [selectedTab] : [];
    },
  );
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

  const activeTicketId =
    activeWorkspacePane === "list" ? undefined : activeWorkspacePane.ticketId;
  const listActive = activeWorkspacePane === "list";
  const activeDetail = detailFor(activeTicketId);
  const groupedRows = useMemo(
    () => groupTicketRows(rows, groupBy, sortKey, sortDirection),
    [groupBy, rows, sortDirection, sortKey],
  );
  const sortedRows = useMemo(
    () => {
      if (groupBy !== "none") {
        return groupedRows.flatMap((group) => group.rows);
      }
      if (providerSortEnabled || !localSortEnabled) {
        return rows;
      }
      return sortTicketRows(rows, sortKey, sortDirection);
    },
    [
      groupBy,
      groupedRows,
      localSortEnabled,
      providerSortEnabled,
      rows,
      sortDirection,
      sortKey,
    ],
  );
  const allSelected = sortedRows.length > 0 && selectedRowIds.size === sortedRows.length;
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

  function toggleTableSort(key: WorkspaceTicketSortKey) {
    const direction = nextSortDirection(key);
    setSort(key, direction);
    if (providerSortEnabled && groupBy === "none") {
      onProviderSortChange({ key, direction });
    }
  }

  function refreshList() {
    setSelectedRowIds(new Set());
  }

  function updateOpenTicketTabMetadata({
    group,
    owner,
    priority,
    state,
    ticketExternalId,
  }: TicketMetadataSavedPatch) {
    setOpenTicketTabs((current) =>
      patchTicketTabMetadata(current, {
        group,
        owner,
        priority,
        state,
        ticketExternalId,
      }),
    );
    setRecentTicketTabs((current) =>
      patchTicketTabMetadata(current, {
        group,
        owner,
        priority,
        state,
        ticketExternalId,
      }),
    );
  }

  function refreshSavedTicketDetail(ticketId: string) {
    if (!refreshTicketDetailAfterMetadataSave) {
      return;
    }

    refreshTicketDetail(ticketId);
  }

  function handleGroupByChange(nextGroupBy: WorkspaceTicketGroupKey) {
    setGroupBy(nextGroupBy);
    if (nextGroupBy !== "none" && nextGroupBy === sortKey) {
      setSort("updatedAt", "descending");
    }
  }

  function rememberOpenTicket(ticketId: string) {
    const tab = ticketTabs.find((ticketTab) => ticketTab.id === ticketId);
    if (!tab) {
      return;
    }

    setOpenTicketTabs((current) =>
      current.some((currentTab) => currentTab.id === ticketId)
        ? current
        : [...current, tab],
    );
    setRecentTicketTabs((current) =>
      [tab, ...current.filter((currentTab) => currentTab.id !== ticketId)].slice(
        0,
        8,
      ),
    );
  }

  function showTicketFromRow(ticketId: string) {
    cacheSelectedDetail();
    rememberOpenTicket(ticketId);
    setActiveWorkspacePane({ ticketId });
    replaceWorkspaceUrl(ticketId);
    ensureTicketDetail(ticketId);
  }

  function showList() {
    cacheSelectedDetail();
    setActiveWorkspacePane("list");
    replaceWorkspaceUrl();
  }

  function returnActiveTicketToList() {
    cacheSelectedDetail();
    if (activeTicketId) {
      setOpenTicketTabs((current) =>
        current.filter((tab) => tab.id !== activeTicketId),
      );
    }
    setActiveWorkspacePane("list");
    replaceWorkspaceUrl();
  }

  function showOpenTicket(ticketId: string) {
    cacheSelectedDetail();
    rememberOpenTicket(ticketId);
    setActiveWorkspacePane({ ticketId });
    replaceWorkspaceUrl(ticketId);
  }

  function closeTicket(ticketId: string) {
    cacheSelectedDetail();
    const closingIndex = openTicketTabs.findIndex((tab) => tab.id === ticketId);
    if (closingIndex === -1) {
      return;
    }

    const next = openTicketTabs.filter((tab) => tab.id !== ticketId);
    setOpenTicketTabs(next);

    if (activeTicketId === ticketId) {
      const nextActive = next[closingIndex] ?? next[closingIndex - 1];
      if (nextActive) {
        setActiveWorkspacePane({ ticketId: nextActive.id });
        replaceWorkspaceUrl(nextActive.id);
      } else {
        setActiveWorkspacePane("list");
        replaceWorkspaceUrl();
      }
    }
  }

  return {
    activeDetail,
    activeTicketId,
    allSelected,
    closeTicket,
    groupBy,
    groupedRows,
    handleGroupByChange,
    listActive,
    openTicketTabs,
    partiallySelected,
    recentTicketTabs,
    refreshList,
    returnActiveTicketToList,
    selectedRowIds,
    setTabOrientation,
    showList,
    showOpenTicket,
    showTicketFromRow,
    sortDirectionFor,
    sortingEnabled: providerSortEnabled || localSortEnabled,
    sortedRows,
    tabOrientation,
    toggleColumn,
    toggleRow,
    toggleSelectAll,
    toggleSort: toggleTableSort,
    updateOpenTicketTabMetadata,
    refreshSavedTicketDetail,
    visibleColumnSet,
  };
}

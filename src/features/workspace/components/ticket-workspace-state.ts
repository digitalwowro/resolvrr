"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  initialActiveWorkspacePane,
  initialOpenTicketTabs,
  initialRecentTicketTabs,
} from "./ticket-workspace-persisted-tabs";
import type {
  ActiveWorkspacePane,
  TicketWorkspaceStateProps,
} from "./ticket-workspace-state-types";
import { useTicketDetailLoader } from "./use-ticket-detail-loader";
import { replaceWorkspaceUrl } from "./workspace-url";
import {
  cappedWorkspaceTabs,
  workspaceOpenTabsStateVersion,
} from "@/features/workspace/workspace-tab-state";

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
  initialWorkspaceOpenTabsState,
  saveWorkspaceOpenTabsStateAction,
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
    isTicketDetailRefreshing,
    isTicketDetailStale,
    refreshTicketDetail,
  } = useTicketDetailLoader({
    initialDetailResult,
    loadTicketDetailAction,
    selectedTicketId,
  });
  const [tabOrientation, setTabOrientation] =
    useState<TicketTabOrientation>(
      initialWorkspaceOpenTabsState?.tabOrientation ?? "horizontal",
    );
  const [openTicketTabs, setOpenTicketTabs] = useState<WorkspaceTicketTab[]>(
    () =>
      initialOpenTicketTabs({
        detail,
        initialWorkspaceOpenTabsState,
        selectedTicketId,
        ticketTabs,
      }),
  );
  const [recentTicketTabs, setRecentTicketTabs] = useState<WorkspaceTicketTab[]>(
    () =>
      initialRecentTicketTabs({
        detail,
        initialWorkspaceOpenTabsState,
        selectedTicketId,
        ticketTabs,
      }),
  );
  const [activeWorkspacePane, setActiveWorkspacePane] =
    useState<ActiveWorkspacePane>(() =>
      initialActiveWorkspacePane({
        initialWorkspaceOpenTabsState,
        openTicketTabs,
        selectedTicketId,
      }),
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

  useEffect(() => {
    if (activeTicketId && !activeDetail) {
      ensureTicketDetail(activeTicketId);
    }
  }, [activeDetail, activeTicketId, ensureTicketDetail]);

  useEffect(() => {
    if (
      activeTicketId &&
      activeDetail &&
      activeDetail.status !== "loading" &&
      isTicketDetailStale(activeTicketId, 60_000)
    ) {
      refreshTicketDetail(activeTicketId);
    }
  }, [
    activeDetail,
    activeTicketId,
    isTicketDetailStale,
    refreshTicketDetail,
  ]);

  useEffect(() => {
    if (!saveWorkspaceOpenTabsStateAction) {
      return;
    }

    void saveWorkspaceOpenTabsStateAction({
      activePane: activeTicketId ?? "list",
      openTabs: cappedWorkspaceTabs(openTicketTabs),
      recentTabs: cappedWorkspaceTabs(recentTicketTabs),
      tabOrientation,
      updatedAt: new Date().toISOString(),
      version: workspaceOpenTabsStateVersion,
    }).catch(() => undefined);
  }, [
    activeTicketId,
    openTicketTabs,
    recentTicketTabs,
    saveWorkspaceOpenTabsStateAction,
    tabOrientation,
  ]);

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

  function clearRowSelection() {
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

  function refreshActiveTicketDetail() {
    if (!activeTicketId) {
      return;
    }

    refreshTicketDetail(activeTicketId);
  }

  function refreshTicketDetailById(ticketId: string) {
    refreshTicketDetail(ticketId);
  }

  function isActiveTicketDetailStale(staleMs: number) {
    return activeTicketId ? isTicketDetailStale(activeTicketId, staleMs) : false;
  }

  function handleGroupByChange(nextGroupBy: WorkspaceTicketGroupKey) {
    setGroupBy(nextGroupBy);
    if (nextGroupBy !== "none" && nextGroupBy === sortKey) {
      setSort("updatedAt", "descending");
    }
  }

  function rememberOpenTicket(ticketId: string) {
    const tab = ticketTabs.find((ticketTab) => ticketTab.id === ticketId) ??
      openTicketTabs.find((ticketTab) => ticketTab.id === ticketId);
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

  function showNotificationTicket(tab: WorkspaceTicketTab) {
    const ticketId = tab.id;
    const hydratedTab =
      ticketTabs.find((ticketTab) => ticketTab.id === ticketId) ??
      openTicketTabs.find((ticketTab) => ticketTab.id === ticketId) ??
      tab;

    cacheSelectedDetail();
    setOpenTicketTabs((current) =>
      cappedWorkspaceTabs(
        current.some((currentTab) => currentTab.id === ticketId)
          ? current
          : [hydratedTab, ...current],
      ),
    );
    setRecentTicketTabs((current) =>
      cappedWorkspaceTabs([
        hydratedTab,
        ...current.filter((currentTab) => currentTab.id !== ticketId),
      ]),
    );
    setActiveWorkspacePane({ ticketId });
    replaceWorkspaceUrl(ticketId);
    ensureTicketDetail(ticketId);
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

  function reorderOpenTicketTabs(sourceTicketId: string, targetIndex: number) {
    setOpenTicketTabs((current) => {
      const sourceIndex = current.findIndex((tab) => tab.id === sourceTicketId);
      if (sourceIndex === -1) {
        return current;
      }

      const next = current.filter((tab) => tab.id !== sourceTicketId);
      const clampedTargetIndex = Math.max(0, Math.min(targetIndex, next.length));
      next.splice(clampedTargetIndex, 0, current[sourceIndex]);
      return next.every((tab, index) => tab.id === current[index]?.id)
        ? current
        : next;
    });
  }

  return {
    activeDetail,
    activeTicketId,
    allSelected,
    closeTicket,
    clearRowSelection,
    groupBy,
    groupedRows,
    handleGroupByChange,
    isActiveTicketDetailStale,
    listActive,
    openTicketTabs,
    partiallySelected,
    recentTicketTabs,
    refreshActiveTicketDetail,
    refreshTicketDetailById,
    refreshList,
    reorderOpenTicketTabs,
    returnActiveTicketToList,
    selectedRowIds,
    setTabOrientation,
    showList,
    showNotificationTicket,
    showOpenTicket,
    showTicketFromRow,
    sortDirectionFor,
    sortingEnabled: providerSortEnabled || localSortEnabled,
    sortedRows,
    tabOrientation,
    ticketDetailRefreshing: activeTicketId
      ? isTicketDetailRefreshing(activeTicketId)
      : false,
    toggleColumn,
    toggleRow,
    toggleSelectAll,
    toggleSort: toggleTableSort,
    updateOpenTicketTabMetadata,
    refreshSavedTicketDetail,
    visibleColumnSet,
  };
}

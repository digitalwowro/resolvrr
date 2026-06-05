"use client";

import { useEffect, useMemo } from "react";
import type { TicketWorkspaceStateProps } from "./ticket-workspace-state-types";
import { useTicketDetailLoader } from "./use-ticket-detail-loader";
import { useTicketWorkspaceTabsState } from "./use-ticket-workspace-tabs-state";
import { useTicketWorkspaceTableState } from "./use-ticket-workspace-table-state";

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
  const {
    activeTicketId,
    closeTicket,
    listActive,
    openTicketTabs,
    recentTicketTabs,
    reorderOpenTicketTabs,
    returnActiveTicketToList,
    setTabOrientation,
    showList,
    showNotificationTicket,
    showOpenTicket,
    showTicketFromRow,
    tabOrientation,
    updateOpenTicketTabMetadata,
  } = useTicketWorkspaceTabsState({
    cacheSelectedDetail,
    detail,
    ensureTicketDetail,
    initialWorkspaceOpenTabsState,
    saveWorkspaceOpenTabsStateAction,
    selectedTicketId,
    ticketTabs,
  });
  const activeDetail = detailFor(activeTicketId);
  const {
    allSelected,
    clearRowSelection,
    groupBy,
    groupedRows,
    handleGroupByChange,
    partiallySelected,
    selectedRowIds,
    sortDirectionFor,
    sortingEnabled,
    sortedRows,
    toggleColumn,
    toggleRow,
    toggleSelectAll,
    toggleSort,
    visibleColumnSet,
  } = useTicketWorkspaceTableState({
    columns,
    localSortEnabled,
    onProviderSortChange,
    providerSortEnabled,
    rows,
  });

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

  function refreshList() {
    clearRowSelection();
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
    sortingEnabled,
    sortedRows,
    tabOrientation,
    ticketDetailRefreshing: activeTicketId
      ? isTicketDetailRefreshing(activeTicketId)
      : false,
    toggleColumn,
    toggleRow,
    toggleSelectAll,
    toggleSort,
    updateOpenTicketTabMetadata,
    refreshSavedTicketDetail,
    visibleColumnSet,
  };
}

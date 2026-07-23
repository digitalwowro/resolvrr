"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  workspaceId,
}: TicketWorkspaceStateProps) {
  const initialDetailResult = useMemo(
    () =>
      detailResult?.status === "available" && detailResult.resolution
        ? detailResult
        : detail
          ? { status: "available" as const, detail }
          : detailResult,
    [detail, detailResult],
  );
  const {
    adoptResolvedDetail,
    cacheSelectedDetail,
    detailFor,
    ensureTicketDetail,
    isTicketDetailRefreshing,
    isTicketDetailStale,
    refreshTicketDetail,
    setTicketAiSummary,
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
    importOpenTicketTabs,
    reorderOpenTicketTabs,
    returnActiveTicketToList,
    setTabOrientation,
    showList,
    showNotificationTicket,
    showOpenTicket,
    showTicketFromRow,
    tabOrientation,
    updateOpenTicketTabMetadata,
    replaceMergedTicket,
  } = useTicketWorkspaceTabsState({
    cacheSelectedDetail,
    detail,
    ensureTicketDetail,
    initialWorkspaceOpenTabsState,
    saveWorkspaceOpenTabsStateAction,
    selectedTicketId,
    ticketTabs,
    workspaceId,
  });
  const activeDetail = detailFor(activeTicketId);
  const handledMergeResolutions = useRef(new Set<string>());
  const [mergeNotice, setMergeNotice] = useState<string>();
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

  useEffect(() => {
    if (activeDetail?.status !== "available" || !activeDetail.resolution) {
      return;
    }
    const { resolution } = activeDetail;
    const sourceIds = resolution.sources.map((source) => source.externalId);
    const key = `${sourceIds.join(",")}->${resolution.targetExternalId}`;
    if (handledMergeResolutions.current.has(key)) {
      return;
    }
    handledMergeResolutions.current.add(key);
    adoptResolvedDetail(
      sourceIds,
      resolution.targetExternalId,
      activeDetail,
    );
    replaceMergedTicket(sourceIds, activeDetail.detail);
    const sourceNumber = resolution.sources[0]?.number ?? sourceIds[0];
    setMergeNotice(
      `Ticket #${sourceNumber} was merged into ${activeDetail.detail.number}.`,
    );
  }, [activeDetail, adoptResolvedDetail, replaceMergedTicket]);

  useEffect(() => {
    if (!mergeNotice) {
      return;
    }
    const timeout = window.setTimeout(() => setMergeNotice(undefined), 6000);
    return () => window.clearTimeout(timeout);
  }, [mergeNotice]);

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
    mergeNotice,
    openTicketTabs,
    partiallySelected,
    recentTicketTabs,
    importOpenTicketTabs,
    refreshActiveTicketDetail,
    refreshTicketDetailById,
    refreshList,
    reorderOpenTicketTabs,
    returnActiveTicketToList,
    selectedRowIds,
    setTicketAiSummary,
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

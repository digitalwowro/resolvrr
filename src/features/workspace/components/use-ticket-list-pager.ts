"use client";

import { useRef, useState } from "react";
import type {
  WorkspaceTicketListPageLoadResult,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketGroupKey } from "@/features/tickets/workspace-adapter";
import {
  appendUniqueRows,
  savedViewListRequest,
  ticketListIdentity,
} from "./ticket-list-pager-rows";
import type { TicketListPagerProps } from "./ticket-list-pager-types";
import { useTicketListGroupLoader } from "./use-ticket-list-group-loader";
import { useTicketListSilentRefresh } from "./use-ticket-list-silent-refresh";
import { useTicketListServerSync } from "./use-ticket-list-server-sync";
import { useCompleteTicketListSort } from "./use-complete-ticket-list-sort";
import { useTicketListPagerCompleteValues } from "./ticket-list-pager-complete-values";
import {
  loadFirstTicketListPage,
  loadTicketListPageSafely,
} from "./ticket-list-first-page-load";
export function useTicketListPager({
  initialSavedViewId,
  initialGroups,
  initialRows,
  initialNextCursor,
  initialTotalCount,
  loadTicketListPageAction,
}: TicketListPagerProps) {
  const [rows, setRows] = useState(initialRows);
  const [savedViewId, setSavedViewId] = useState(initialSavedViewId);
  const [groups, setGroups] = useState(initialGroups);
  const [groupBy, setGroupBy] = useState<"state" | "priority">();
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [errorReason, setErrorReason] = useState<TicketReadUnavailableReason>();
  const [sort, setSort] = useState<WorkspaceTicketListSort>();
  const baselineIdentity = useRef(ticketListIdentity(initialRows));
  const hasClientLoadedRowsRef = useRef(false);
  const loadedPageCountRef = useRef(1);
  const groupPageCountsRef = useRef(
    new Map((initialGroups ?? []).map((group) => [group.id, 1])),
  );
  const lastRefreshedAtRef = useRef<number | undefined>(undefined);
  const { groupError, loadMoreGroup, loadingGroupId, setGroupError } =
    useTicketListGroupLoader({
      groupPageCountsRef,
      groupBy,
      loadTicketListPageAction,
      savedViewId,
      setGroups,
      setRows,
    });
  const { isListStale, silentRefreshCurrentPage, silentRefreshing } =
    useTicketListSilentRefresh({
      groupBy,
      groupPageCountsRef,
      hasClientLoadedRowsRef,
      lastRefreshedAtRef,
      loadTicketListPageAction,
      loadedPageCountRef,
      loading,
      savedViewId,
      setErrorReason,
      setGroupError,
      setGroups,
      setNextCursor,
      setRows,
      setTotalCount,
      sort,
    });
  const completeSort = useCompleteTicketListSort({
    initialPageSize: initialRows.length || 25,
    loadAction: loadTicketListPageAction,
    onLoaded: () => {
      lastRefreshedAtRef.current = Date.now();
    },
    savedViewId,
    sourceNextCursor: nextCursor,
    sourceRows: rows,
    sourceTotalCount: totalCount,
  });
  useTicketListServerSync({
    activeCompleteSort: completeSort.sort,
    activeGroupBy: groupBy,
    activeSavedViewId: savedViewId,
    activeSort: sort,
    baselineIdentityRef: baselineIdentity,
    groupPageCountsRef,
    hasClientLoadedRowsRef,
    initialGroups,
    initialNextCursor,
    initialRows,
    initialSavedViewId,
    initialTotalCount,
    lastRefreshedAtRef,
    loadTicketListPageAction,
    loadedPageCountRef,
    refreshCompleteSort: completeSort.refresh,
    setErrorReason,
    setGroupBy,
    setGroups,
    setLoading,
    setNextCursor,
    setRows,
    setSavedViewId,
    setTotalCount,
    silentRefreshCurrentPage,
  });

  async function loadMore() {
    if (!nextCursor || loading || !loadTicketListPageAction) {
      return;
    }

    setLoading(true);
    setErrorReason(undefined);
    let result;
    try {
      result = await loadTicketListPageAction({
        cursor: nextCursor,
        ...savedViewListRequest(savedViewId),
        ...(sort ? { sort } : {}),
      });
    } catch {
      setLoading(false);
      setErrorReason("provider-temporary-failure");
      return;
    }
    setLoading(false);

    if (result.status === "unavailable") {
      setErrorReason(result.reason);
      return;
    }

    setNextCursor(result.nextCursor);
    setTotalCount(result.totalCount);
    lastRefreshedAtRef.current = Date.now();
    hasClientLoadedRowsRef.current = true;
    loadedPageCountRef.current += 1;
    setRows((current) => appendUniqueRows(current, result.rows));
  }

  async function reloadFirstPage(nextSort = sort) {
    if (loading || !loadTicketListPageAction) {
      return;
    }
    completeSort.clear();

    setLoading(true);
    setErrorReason(undefined);
    const result = await loadFirstTicketListPage(
      loadTicketListPageAction,
      savedViewId,
      nextSort,
    );
    setLoading(false);

    if (result.status === "unavailable") {
      setErrorReason(result.reason);
      return;
    }

    hasClientLoadedRowsRef.current = false;
    loadedPageCountRef.current = 1;
    groupPageCountsRef.current = new Map();
    baselineIdentity.current = ticketListIdentity(result.rows);
    setSort(result.appliedSort ?? nextSort);
    setGroups(undefined);
    setGroupBy(undefined);
    setRows(result.rows);
    setNextCursor(result.nextCursor);
    setTotalCount(result.totalCount);
    lastRefreshedAtRef.current = Date.now();
  }

  async function reloadGroupedFirstPage(nextGroupBy: "state" | "priority") {
    if (loading || !loadTicketListPageAction) {
      return;
    }
    completeSort.clear();

    setLoading(true);
    setErrorReason(undefined);
    setGroupError(undefined);
    const result = await loadTicketListPageSafely(loadTicketListPageAction, {
      group: nextGroupBy,
      ...savedViewListRequest(savedViewId),
    });
    setLoading(false);

    if (result.status === "unavailable") {
      setErrorReason(result.reason);
      return;
    }

    const nextGroups = result.groups ?? [];
    hasClientLoadedRowsRef.current = false;
    loadedPageCountRef.current = 1;
    groupPageCountsRef.current = new Map(nextGroups.map((group) => [group.id, 1]));
    baselineIdentity.current = ticketListIdentity(result.rows);
    setGroupBy(nextGroupBy);
    setGroups(nextGroups);
    setRows(result.rows);
    setNextCursor(undefined);
    setTotalCount(result.totalCount);
    lastRefreshedAtRef.current = Date.now();
  }

  async function reloadSavedView(nextSavedViewId: string): Promise<
    | { status: "available"; groupBy?: WorkspaceTicketGroupKey }
    | Extract<WorkspaceTicketListPageLoadResult, { status: "unavailable" }>
  > {
    if (loading || !loadTicketListPageAction) {
      return {
        status: "unavailable",
        reason: "provider-temporary-failure",
        retryable: true,
      };
    }
    completeSort.clear();

    setLoading(true);
    setErrorReason(undefined);
    setGroupError(undefined);
    const result = await loadTicketListPageSafely(
      loadTicketListPageAction,
      savedViewListRequest(nextSavedViewId),
    );
    setLoading(false);

    if (result.status === "unavailable") {
      setErrorReason(result.reason);
      return result;
    }

    const nextGroups = result.groups?.length ? result.groups : undefined;
    hasClientLoadedRowsRef.current = false;
    loadedPageCountRef.current = 1;
    groupPageCountsRef.current = new Map(
      (nextGroups ?? []).map((group) => [group.id, 1]),
    );
    baselineIdentity.current = ticketListIdentity(result.rows);
    setSavedViewId(nextSavedViewId);
    setSort(result.appliedSort);
    setGroupBy(
      result.appliedGroupBy === "state" || result.appliedGroupBy === "priority"
        ? result.appliedGroupBy
        : undefined,
    );
    setGroups(nextGroups);
    setRows(result.rows);
    setNextCursor(result.nextCursor);
    setTotalCount(result.totalCount);
    lastRefreshedAtRef.current = Date.now();

    return { status: "available", groupBy: result.appliedGroupBy };
  }

  const completeValues = useTicketListPagerCompleteValues({
    completeSort,
    fallback: {
      canLoadMore: Boolean(nextCursor && loadTicketListPageAction),
      hasMorePages: Boolean(nextCursor),
      loadedCount: rows.length,
      loading,
      loadMore,
      rows,
      silentRefreshCurrentPage,
      silentRefreshing,
      sort,
      totalCount,
    },
  });

  return {
    applyCompleteListSort: completeSort.apply,
    completeSortProgress: completeSort.progress,
    completeSortError: completeSort.error,
    errorReason,
    groupBy,
    groupError,
    groups,
    loadMoreGroup,
    loadingGroupId,
    reloadGroupedFirstPage,
    reloadFirstPage,
    reloadSavedView,
    savedViewId,
    isListStale,
    ...completeValues,
  };
}

"use client";

import { useEffect, useRef, useState } from "react";
import type {
  WorkspaceTicketListPageLoadResult,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketGroupKey } from "@/features/tickets/workspace-adapter";
import {
  appendUniqueRows,
  mergeRefreshedBaselineRows,
  savedViewListRequest,
  ticketListIdentity,
} from "./ticket-list-pager-rows";
import type { TicketListPagerProps } from "./ticket-list-pager-types";
import { useTicketListGroupLoader } from "./use-ticket-list-group-loader";
import { useTicketListSilentRefresh } from "./use-ticket-list-silent-refresh";
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

  useEffect(() => {
    lastRefreshedAtRef.current ??= Date.now();
    const nextIdentity = ticketListIdentity(initialRows);
    const sameListIdentity = baselineIdentity.current === nextIdentity;
    baselineIdentity.current = nextIdentity;

    if (!sameListIdentity) {
      setRows(initialRows);
      setSavedViewId(initialSavedViewId);
      setGroups(initialGroups);
      setGroupBy(initialGroups?.[0]?.key);
      setNextCursor(initialNextCursor);
      setTotalCount(initialTotalCount);
      setErrorReason(undefined);
      setLoading(false);
      hasClientLoadedRowsRef.current = false;
      loadedPageCountRef.current = 1;
      groupPageCountsRef.current = new Map(
        (initialGroups ?? []).map((group) => [group.id, 1]),
      );
      lastRefreshedAtRef.current = Date.now();
      return;
    }

    setRows((current) => mergeRefreshedBaselineRows(current, initialRows));
    setNextCursor((current) => hasClientLoadedRowsRef.current ? current : initialNextCursor);
    setTotalCount(initialTotalCount);
    lastRefreshedAtRef.current = Date.now();
  }, [
    initialGroups,
    initialRows,
    initialNextCursor,
    initialSavedViewId,
    initialTotalCount,
  ]);

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

    setLoading(true);
    setErrorReason(undefined);
    let result;
    try {
      result = await loadTicketListPageAction({
        ...savedViewListRequest(savedViewId),
        ...(nextSort ? { sort: nextSort } : {}),
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

    setLoading(true);
    setErrorReason(undefined);
    setGroupError(undefined);
    let result;
    try {
      result = await loadTicketListPageAction({
        group: nextGroupBy,
        ...savedViewListRequest(savedViewId),
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

    setLoading(true);
    setErrorReason(undefined);
    setGroupError(undefined);
    let result;
    try {
      result = await loadTicketListPageAction({
        ...savedViewListRequest(nextSavedViewId),
      });
    } catch {
      setLoading(false);
      setErrorReason("provider-temporary-failure");
      return {
        status: "unavailable",
        reason: "provider-temporary-failure",
        retryable: true,
      };
    }
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

  return {
    canLoadMore: Boolean(nextCursor && loadTicketListPageAction),
    errorReason,
    groupBy,
    groupError,
    groups,
    hasMorePages: Boolean(nextCursor),
    loadedCount: rows.length,
    loading,
    loadMoreGroup,
    loadMore,
    loadingGroupId,
    reloadGroupedFirstPage,
    reloadFirstPage,
    reloadSavedView,
    rows,
    savedViewId,
    silentRefreshCurrentPage,
    silentRefreshing,
    isListStale,
    sort,
    totalCount,
  };
}

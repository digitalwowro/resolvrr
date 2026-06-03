"use client";

import { useEffect, useRef, useState } from "react";
import type {
  WorkspaceTicketListGroup,
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
  const [loadingGroupId, setLoadingGroupId] = useState<string>();
  const [errorReason, setErrorReason] = useState<TicketReadUnavailableReason>();
  const [groupError, setGroupError] =
    useState<{ groupId: string; reason: TicketReadUnavailableReason }>();
  const [sort, setSort] = useState<WorkspaceTicketListSort>();
  const [silentRefreshing, setSilentRefreshing] = useState(false);
  const baselineIdentity = useRef(ticketListIdentity(initialRows));
  const hasClientLoadedRowsRef = useRef(false);
  const lastRefreshedAtRef = useRef<number | undefined>(undefined);
  const silentRefreshInFlightRef = useRef(false);

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

  async function silentRefreshCurrentPage() {
    if (
      loading ||
      silentRefreshInFlightRef.current ||
      !loadTicketListPageAction
    ) {
      return;
    }

    silentRefreshInFlightRef.current = true;
    setSilentRefreshing(true);
    try {
      const result = await loadTicketListPageAction({
        ...(groupBy ? { group: groupBy } : {}),
        ...savedViewListRequest(savedViewId),
        ...(sort && !groupBy ? { sort } : {}),
      });
      if (result.status === "unavailable") {
        return;
      }

      lastRefreshedAtRef.current = Date.now();
      setErrorReason(undefined);
      setGroupError(undefined);
      setTotalCount(result.totalCount);
      if (groupBy) {
        const refreshedGroups = result.groups ?? [];
        setGroups((current) => {
          const currentById = new Map(
            (current ?? []).map((group) => [group.id, group]),
          );
          const nextGroups = refreshedGroups.map((group) => {
            const currentGroup = currentById.get(group.id);
            return currentGroup
              ? {
                  ...group,
                  loadedCount: Math.max(
                    currentGroup.loadedCount ?? currentGroup.rows.length,
                    group.loadedCount ?? group.rows.length,
                  ),
                  nextCursor: currentGroup.nextCursor ?? group.nextCursor,
                  rows: mergeRefreshedBaselineRows(
                    currentGroup.rows,
                    group.rows,
                  ),
                }
              : group;
          });
          setRows(nextGroups.flatMap((group) => group.rows));
          return nextGroups;
        });
        return;
      }

      setRows((current) => mergeRefreshedBaselineRows(current, result.rows));
      setNextCursor((current) =>
        hasClientLoadedRowsRef.current ? current : result.nextCursor,
      );
    } catch {
      return;
    } finally {
      silentRefreshInFlightRef.current = false;
      setSilentRefreshing(false);
    }
  }

  function isListStale(staleMs: number) {
    const lastRefreshedAt = lastRefreshedAtRef.current;
    return lastRefreshedAt === undefined || Date.now() - lastRefreshedAt >= staleMs;
  }

  async function loadMoreGroup(group: Pick<WorkspaceTicketListGroup, "id" | "nextCursor" | "value">) {
    if (
      !groupBy ||
      !group.nextCursor ||
      loadingGroupId ||
      !loadTicketListPageAction
    ) {
      return;
    }

    setLoadingGroupId(group.id);
    setGroupError(undefined);
    let result;
    try {
      result = await loadTicketListPageAction({
        bucketValue: group.value,
        cursor: group.nextCursor,
        group: groupBy,
        ...savedViewListRequest(savedViewId),
      });
    } catch {
      setLoadingGroupId(undefined);
      setGroupError({
        groupId: group.id,
        reason: "provider-temporary-failure",
      });
      return;
    }
    setLoadingGroupId(undefined);

    if (result.status === "unavailable") {
      setGroupError({ groupId: group.id, reason: result.reason });
      return;
    }

    setGroups((current) => {
      const nextGroups = (current ?? []).map((currentGroup) =>
        currentGroup.id === group.id
          ? {
              ...currentGroup,
              loadedCount: currentGroup.loadedCount + result.rows.length,
              nextCursor: result.nextCursor,
              rows: appendUniqueRows(currentGroup.rows, result.rows),
              totalCount: result.totalCount,
            }
          : currentGroup,
      );
      setRows(nextGroups.flatMap((nextGroup) => nextGroup.rows));
      return nextGroups;
    });
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

"use client";

import { useEffect, useRef, useState } from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListPageLoadResult,
  WorkspaceTicketListGroup,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import { allTicketsSavedViewId } from "@/features/saved-views/workspace";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type {
  WorkspaceTicketGroupKey,
  WorkspaceTicketRow,
} from "@/features/tickets/workspace-adapter";

type TicketListPagerProps = {
  initialSavedViewId: string;
  initialRows: WorkspaceTicketRow[];
  initialGroups?: WorkspaceTicketListGroup[];
  initialNextCursor?: string;
  initialTotalCount?: number;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
};

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
  const [errorReason, setErrorReason] =
    useState<TicketReadUnavailableReason>();
  const [groupError, setGroupError] = useState<{
    groupId: string;
    reason: TicketReadUnavailableReason;
  }>();
  const [sort, setSort] = useState<WorkspaceTicketListSort>();
  const baselineIdentity = useRef(ticketListIdentity(initialRows));
  const hasClientLoadedRowsRef = useRef(false);

  useEffect(() => {
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
      return;
    }

    setRows((current) => mergeRefreshedBaselineRows(current, initialRows));
    setNextCursor((current) =>
      hasClientLoadedRowsRef.current ? current : initialNextCursor,
    );
    setTotalCount(initialTotalCount);
  }, [
    initialGroups,
    initialRows,
    initialNextCursor,
    initialSavedViewId,
    initialTotalCount,
  ]);

  function savedViewRequest() {
    return savedViewId === allTicketsSavedViewId ? {} : { savedViewId };
  }

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
        ...savedViewRequest(),
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
        ...savedViewRequest(),
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
        ...savedViewRequest(),
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
  }

  async function reloadSavedView(
    nextSavedViewId: string,
  ): Promise<
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
        ...(nextSavedViewId === allTicketsSavedViewId
          ? {}
          : { savedViewId: nextSavedViewId }),
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

    return { status: "available", groupBy: result.appliedGroupBy };
  }

  async function loadMoreGroup(
    group: Pick<WorkspaceTicketListGroup, "id" | "nextCursor" | "value">,
  ) {
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
        ...savedViewRequest(),
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
    sort,
    totalCount,
  };
}

function appendUniqueRows(
  current: WorkspaceTicketRow[],
  incoming: WorkspaceTicketRow[],
) {
  const existingIds = new Set(current.map((row) => row.id));
  return [
    ...current,
    ...incoming.filter((row) => {
      if (existingIds.has(row.id)) {
        return false;
      }
      existingIds.add(row.id);
      return true;
    }),
  ];
}

function ticketListIdentity(rows: WorkspaceTicketRow[]) {
  return rows.map((row) => row.id).join("\0");
}

function mergeRefreshedBaselineRows(
  current: WorkspaceTicketRow[],
  baselineRows: WorkspaceTicketRow[],
) {
  const baselineIds = new Set(baselineRows.map((row) => row.id));
  return [
    ...baselineRows,
    ...current.filter((row) => !baselineIds.has(row.id)),
  ];
}

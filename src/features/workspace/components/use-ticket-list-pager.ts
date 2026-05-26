"use client";

import { useEffect, useRef, useState } from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";

type TicketListPagerProps = {
  initialRows: WorkspaceTicketRow[];
  initialNextCursor?: string;
  initialTotalCount?: number;
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
};

export function useTicketListPager({
  initialRows,
  initialNextCursor,
  initialTotalCount,
  loadTicketListPageAction,
}: TicketListPagerProps) {
  const [rows, setRows] = useState(initialRows);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [loading, setLoading] = useState(false);
  const [errorReason, setErrorReason] =
    useState<TicketReadUnavailableReason>();
  const [sort, setSort] = useState<WorkspaceTicketListSort>();
  const baselineIdentity = useRef(ticketListIdentity(initialRows));
  const hasClientLoadedRowsRef = useRef(false);

  useEffect(() => {
    const nextIdentity = ticketListIdentity(initialRows);
    const sameListIdentity = baselineIdentity.current === nextIdentity;
    baselineIdentity.current = nextIdentity;

    if (!sameListIdentity) {
      setRows(initialRows);
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
  }, [initialRows, initialNextCursor, initialTotalCount]);

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

  async function reloadFirstPage(nextSort: WorkspaceTicketListSort) {
    if (loading || !loadTicketListPageAction) {
      return;
    }

    setSort(nextSort);
    setLoading(true);
    setErrorReason(undefined);
    let result;
    try {
      result = await loadTicketListPageAction({ sort: nextSort });
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
    setRows(result.rows);
    setNextCursor(result.nextCursor);
    setTotalCount(result.totalCount);
  }

  return {
    canLoadMore: Boolean(nextCursor && loadTicketListPageAction),
    errorReason,
    hasMorePages: Boolean(nextCursor),
    loadedCount: rows.length,
    loading,
    loadMore,
    reloadFirstPage,
    rows,
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

"use client";

import { useState } from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  TicketReadUnavailableReason,
  WorkspaceTicketRow,
} from "@/features/tickets";

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

  async function loadMore() {
    if (!nextCursor || loading || !loadTicketListPageAction) {
      return;
    }

    setLoading(true);
    setErrorReason(undefined);
    let result;
    try {
      result = await loadTicketListPageAction(nextCursor);
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
    setRows((current) => appendUniqueRows(current, result.rows));
  }

  return {
    canLoadMore: Boolean(nextCursor && loadTicketListPageAction),
    errorReason,
    loadedCount: rows.length,
    loading,
    loadMore,
    rows,
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

"use client";

import { useState, useTransition } from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  TicketReadUnavailable,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets";

type TicketListPaginationProps = {
  initialRows: WorkspaceTicketRow[];
  initialTabs: WorkspaceTicketTab[];
  initialLoadedCount: number;
  initialTotalCount?: number;
  initialNextCursor?: string;
  loadTicketListPageAction: LoadWorkspaceTicketListPageAction;
};

type TicketListPageState = {
  rows: WorkspaceTicketRow[];
  tabs: WorkspaceTicketTab[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
  error?: TicketReadUnavailable;
};

function mergeById<T extends { id: string }>(current: T[], incoming: T[]): T[] {
  const merged = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) {
    merged.set(item.id, item);
  }
  return Array.from(merged.values());
}

export function useTicketListPagination({
  initialRows,
  initialTabs,
  initialLoadedCount,
  initialTotalCount,
  initialNextCursor,
  loadTicketListPageAction,
}: TicketListPaginationProps) {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<TicketListPageState>(() => ({
    rows: initialRows,
    tabs: initialTabs,
    loadedCount: initialLoadedCount,
    totalCount: initialTotalCount,
    nextCursor: initialNextCursor,
  }));

  function loadNextPage() {
    if (!state.nextCursor || isPending) {
      return;
    }

    const cursor = state.nextCursor;
    startTransition(async () => {
      const result = await loadTicketListPageAction(cursor);
      if (result.status === "unavailable") {
        setState((current) => ({ ...current, error: result }));
        return;
      }

      setState((current) => {
        const rows = mergeById(current.rows, result.page.rows);
        return {
          rows,
          tabs: mergeById(current.tabs, result.page.tabs),
          loadedCount: rows.length,
          totalCount: result.page.totalCount,
          nextCursor: result.page.nextCursor,
        };
      });
    });
  }

  return {
    ...state,
    loadingMore: isPending,
    loadNextPage,
  };
}

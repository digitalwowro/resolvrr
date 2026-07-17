"use client";

import { useRef, useState } from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import { appendUniqueRows, savedViewListRequest } from "./ticket-list-pager-rows";
import { sortTicketRows } from "./ticket-table-grouping";

type CompleteSortSession = {
  rows: WorkspaceTicketRow[];
  sort: WorkspaceTicketListSort;
  visibleCount: number;
};

export function useCompleteTicketListSort({
  initialPageSize,
  loadAction,
  onLoaded,
  savedViewId,
  sourceNextCursor,
  sourceRows,
  sourceTotalCount,
}: {
  initialPageSize: number;
  loadAction?: LoadWorkspaceTicketListPageAction;
  onLoaded(): void;
  savedViewId: string;
  sourceNextCursor?: string;
  sourceRows: WorkspaceTicketRow[];
  sourceTotalCount?: number;
}) {
  const generationRef = useRef(0);
  const pageSizeRef = useRef(Math.max(initialPageSize, 1));
  const [session, setSession] = useState<CompleteSortSession>();
  const [progress, setProgress] = useState<{
    loadedCount: number;
    sortKey: WorkspaceTicketListSort["key"];
    totalCount?: number;
  }>();
  const [error, setError] = useState(false);

  async function loadAll(
    sort: WorkspaceTicketListSort,
    visibleCount: number,
    seed?: { rows: WorkspaceTicketRow[]; nextCursor?: string; totalCount?: number },
  ) {
    const generation = ++generationRef.current;
    try {
      let rows = seed?.rows ?? [];
      let cursor = seed?.nextCursor;
      let totalCount = seed?.totalCount;
      const seenCursors = new Set<string>();
      if ((!seed || cursor) && !loadAction) throw new Error("loader-unavailable");
      setError(false);
      setProgress({ loadedCount: rows.length, sortKey: sort.key, totalCount });

      if (!seed && loadAction) {
        const first = await loadAction(savedViewListRequest(savedViewId));
        if (generation !== generationRef.current) return;
        if (first.status === "unavailable") throw new Error(first.reason);
        rows = first.rows;
        cursor = first.nextCursor;
        totalCount = first.totalCount;
        setProgress({ loadedCount: rows.length, sortKey: sort.key, totalCount });
      }

      while (cursor && loadAction) {
        if (seenCursors.has(cursor)) throw new Error("repeated-list-cursor");
        seenCursors.add(cursor);
        const next = await loadAction({
          cursor,
          ...savedViewListRequest(savedViewId),
        });
        if (generation !== generationRef.current) return;
        if (next.status === "unavailable") throw new Error(next.reason);
        rows = appendUniqueRows(rows, next.rows);
        cursor = next.nextCursor;
        totalCount = next.totalCount ?? totalCount;
        setProgress({ loadedCount: rows.length, sortKey: sort.key, totalCount });
      }

      if (totalCount !== undefined && rows.length < totalCount) {
        throw new Error("incomplete-ticket-list");
      }

      if (generation !== generationRef.current) return;
      const sortedRows = sortTicketRows(rows, sort.key, sort.direction);
      setSession({
        rows: sortedRows,
        sort,
        visibleCount: Math.min(Math.max(visibleCount, 1), sortedRows.length),
      });
      setProgress(undefined);
      onLoaded();
    } catch {
      if (generation === generationRef.current) {
        setProgress(undefined);
        setError(true);
      }
    }
  }

  async function apply(sort: WorkspaceTicketListSort) {
    if (session) {
      setSession({
        ...session,
        rows: sortTicketRows(session.rows, sort.key, sort.direction),
        sort,
      });
      return;
    }
    await loadAll(sort, pageSizeRef.current, {
      rows: sourceRows,
      nextCursor: sourceNextCursor,
      totalCount: sourceTotalCount,
    });
  }

  async function refresh() {
    if (!session || !loadAction) return;
    await loadAll(session.sort, session.visibleCount);
  }

  function clear() {
    generationRef.current += 1;
    setSession(undefined);
    setProgress(undefined);
    setError(false);
  }

  function showMore() {
    setSession((current) => current ? {
      ...current,
      visibleCount: Math.min(
        current.visibleCount + pageSizeRef.current,
        current.rows.length,
      ),
    } : current);
  }

  return {
    active: Boolean(session),
    apply,
    clear,
    error,
    loading: Boolean(progress),
    progress,
    refresh,
    rows: session?.rows.slice(0, session.visibleCount),
    showMore,
    sort: session?.sort,
    totalCount: session?.rows.length,
    visibleCount: session?.visibleCount,
  };
}

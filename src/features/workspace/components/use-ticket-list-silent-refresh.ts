"use client";

import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import { savedViewListRequest } from "./ticket-list-pager-rows";
import { refreshAuthoritativeTicketList } from "./ticket-list-authoritative-refresh";

type UseTicketListSilentRefreshOptions = {
  groupBy?: "state" | "priority";
  groupPageCountsRef: { current: Map<string, number> };
  hasClientLoadedRowsRef: { current: boolean };
  lastRefreshedAtRef: { current: number | undefined };
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
  loadedPageCountRef: { current: number };
  loading: boolean;
  savedViewId: string;
  setErrorReason: Dispatch<SetStateAction<TicketReadUnavailableReason | undefined>>;
  setGroupError: Dispatch<
    SetStateAction<
      { groupId: string; reason: TicketReadUnavailableReason } | undefined
    >
  >;
  setGroups: Dispatch<SetStateAction<WorkspaceTicketListGroup[] | undefined>>;
  setNextCursor: Dispatch<SetStateAction<string | undefined>>;
  setRows: Dispatch<SetStateAction<WorkspaceTicketRow[]>>;
  setTotalCount: Dispatch<SetStateAction<number | undefined>>;
  sort?: WorkspaceTicketListSort;
};

export function useTicketListSilentRefresh({
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
}: UseTicketListSilentRefreshOptions) {
  const [silentRefreshing, setSilentRefreshing] = useState(false);
  const silentRefreshInFlightRef = useRef(false);

  const silentRefreshCurrentPage = useCallback(async () => {
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
      const refresh = await refreshAuthoritativeTicketList({
        groupBy,
        groupPageCounts: groupPageCountsRef.current,
        load: loadTicketListPageAction,
        pageCount: loadedPageCountRef.current,
        request: {
          ...(groupBy ? { group: groupBy } : {}),
          ...savedViewListRequest(savedViewId),
          ...(sort && !groupBy ? { sort } : {}),
        },
      });
      if (refresh.status === "unavailable") {
        return;
      }
      const { result } = refresh;

      loadedPageCountRef.current = refresh.loadedPageCount;
      groupPageCountsRef.current = refresh.loadedGroupPageCounts;
      lastRefreshedAtRef.current = Date.now();
      setErrorReason(undefined);
      setGroupError(undefined);
      setTotalCount(result.totalCount);
      if (groupBy) {
        const refreshedGroups = result.groups ?? [];
        hasClientLoadedRowsRef.current = refreshedGroups.some(
          (group) => (refresh.loadedGroupPageCounts.get(group.id) ?? 1) > 1,
        );
        setGroups(refreshedGroups);
        setRows(refreshedGroups.flatMap((group) => group.rows));
        setNextCursor(undefined);
        return;
      }

      hasClientLoadedRowsRef.current = refresh.loadedPageCount > 1;
      setGroups(undefined);
      setRows(result.rows);
      setNextCursor(result.nextCursor);
    } catch {
      return;
    } finally {
      silentRefreshInFlightRef.current = false;
      setSilentRefreshing(false);
    }
  }, [
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
  ]);

  const isListStale = useCallback(
    (staleMs: number) => {
      const lastRefreshedAt = lastRefreshedAtRef.current;
      return (
        lastRefreshedAt === undefined ||
        Date.now() - lastRefreshedAt >= staleMs
      );
    },
    [lastRefreshedAtRef],
  );

  return { isListStale, silentRefreshCurrentPage, silentRefreshing };
}

"use client";

import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import type {
  LoadWorkspaceTicketListPageAction,
  WorkspaceTicketListGroup,
  WorkspaceTicketListSort,
} from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import {
  mergeRefreshedBaselineRows,
  savedViewListRequest,
} from "./ticket-list-pager-rows";

type UseTicketListSilentRefreshOptions = {
  groupBy?: "state" | "priority";
  hasClientLoadedRowsRef: { current: boolean };
  lastRefreshedAtRef: { current: number | undefined };
  loadTicketListPageAction?: LoadWorkspaceTicketListPageAction;
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
  hasClientLoadedRowsRef,
  lastRefreshedAtRef,
  loadTicketListPageAction,
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

  return { isListStale, silentRefreshCurrentPage, silentRefreshing };
}

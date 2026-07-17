"use client";

import {
  useEffect,
  useRef,
  type Dispatch,
  type MutableRefObject,
  type SetStateAction,
} from "react";
import type { WorkspaceTicketListSort } from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import {
  mergeRefreshedBaselineRows,
  ticketListIdentity,
} from "./ticket-list-pager-rows";
import type { TicketListPagerProps } from "./ticket-list-pager-types";

type Options = TicketListPagerProps & {
  activeCompleteSort?: WorkspaceTicketListSort;
  activeGroupBy?: "state" | "priority";
  activeSavedViewId: string;
  activeSort?: WorkspaceTicketListSort;
  baselineIdentityRef: MutableRefObject<string>;
  groupPageCountsRef: MutableRefObject<Map<string, number>>;
  hasClientLoadedRowsRef: MutableRefObject<boolean>;
  lastRefreshedAtRef: MutableRefObject<number | undefined>;
  loadedPageCountRef: MutableRefObject<number>;
  setErrorReason: Dispatch<SetStateAction<TicketReadUnavailableReason | undefined>>;
  setGroupBy: Dispatch<SetStateAction<"state" | "priority" | undefined>>;
  setGroups: Dispatch<SetStateAction<TicketListPagerProps["initialGroups"]>>;
  setLoading: Dispatch<SetStateAction<boolean>>;
  setNextCursor: Dispatch<SetStateAction<string | undefined>>;
  setRows: Dispatch<SetStateAction<WorkspaceTicketRow[]>>;
  setSavedViewId: Dispatch<SetStateAction<string>>;
  setTotalCount: Dispatch<SetStateAction<number | undefined>>;
  refreshCompleteSort(): Promise<void>;
  silentRefreshCurrentPage(): Promise<void>;
};

export function useTicketListServerSync(options: Options) {
  const {
    baselineIdentityRef,
    groupPageCountsRef,
    hasClientLoadedRowsRef,
    initialGroups,
    initialNextCursor,
    initialRows,
    initialSavedViewId,
    initialTotalCount,
    lastRefreshedAtRef,
    loadedPageCountRef,
    setErrorReason,
    setGroupBy,
    setGroups,
    setLoading,
    setNextCursor,
    setRows,
    setSavedViewId,
    setTotalCount,
  } = options;
  const activeRef = useRef({
    groupBy: options.activeGroupBy,
    completeSort: options.activeCompleteSort,
    savedViewId: options.activeSavedViewId,
    sort: options.activeSort,
    silentRefresh: options.silentRefreshCurrentPage,
    refreshComplete: options.refreshCompleteSort,
  });
  useEffect(() => {
    activeRef.current = {
      groupBy: options.activeGroupBy,
      completeSort: options.activeCompleteSort,
      savedViewId: options.activeSavedViewId,
      sort: options.activeSort,
      silentRefresh: options.silentRefreshCurrentPage,
      refreshComplete: options.refreshCompleteSort,
    };
  }, [
    options.activeCompleteSort,
    options.activeGroupBy,
    options.activeSavedViewId,
    options.activeSort,
    options.refreshCompleteSort,
    options.silentRefreshCurrentPage,
  ]);

  useEffect(() => {
    lastRefreshedAtRef.current ??= Date.now();
    const nextIdentity = ticketListIdentity(initialRows);
    const sameListIdentity = baselineIdentityRef.current === nextIdentity;
    baselineIdentityRef.current = nextIdentity;
    const active = activeRef.current;

    if (
      active.completeSort &&
      active.savedViewId === initialSavedViewId
    ) {
      setTotalCount(initialTotalCount);
      void active.refreshComplete();
      return;
    }

    if (
      active.sort &&
      !active.groupBy &&
      active.savedViewId === initialSavedViewId
    ) {
      setTotalCount(initialTotalCount);
      void active.silentRefresh();
      return;
    }

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

    setRows((current) =>
      mergeRefreshedBaselineRows(current, initialRows),
    );
    setNextCursor((current) =>
      hasClientLoadedRowsRef.current ? current : initialNextCursor,
    );
    setTotalCount(initialTotalCount);
    lastRefreshedAtRef.current = Date.now();
  }, [
    baselineIdentityRef,
    groupPageCountsRef,
    hasClientLoadedRowsRef,
    initialGroups,
    initialNextCursor,
    initialRows,
    initialSavedViewId,
    initialTotalCount,
    lastRefreshedAtRef,
    loadedPageCountRef,
    setErrorReason,
    setGroupBy,
    setGroups,
    setLoading,
    setNextCursor,
    setRows,
    setSavedViewId,
    setTotalCount,
  ]);
}

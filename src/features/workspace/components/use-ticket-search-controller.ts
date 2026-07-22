"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateTicketSearchQuery } from "@/core/ticket-search";
import type {
  SearchWorkspaceTicketsAction,
  WorkspaceTicketSearchResult,
} from "@/features/tickets/search-action-result";
import type { WorkspaceTicketListSort } from "@/features/tickets/list-page-action-result";
import type { TicketReadUnavailableReason } from "@/features/tickets/read-model";
import type { WorkspaceTicketRow } from "@/features/tickets/workspace-adapter";
import { appendUniqueRows } from "./ticket-list-pager-rows";

type SearchScope = {
  userId: string;
  workspaceId: string;
  helpdeskConnectionId: string;
  identityVersion: string;
};

type UseTicketSearchControllerOptions = {
  action?: SearchWorkspaceTicketsAction;
  scope?: SearchScope;
};

const quickSearchDelayMs = 500;
const searchStaleMs = 60_000;

function storageKey(scope: SearchScope) {
  return [
    "resolvrr",
    "ticket-search",
    scope.userId,
    scope.workspaceId,
    scope.helpdeskConnectionId,
    scope.identityVersion,
  ].join(":");
}

export function useTicketSearchController({
  action,
  scope,
}: UseTicketSearchControllerOptions) {
  const scopedStorageKey = scope ? storageKey(scope) : undefined;
  const [query, setQueryState] = useState("");
  const [quickRows, setQuickRows] = useState<WorkspaceTicketRow[]>([]);
  const [quickTotalCount, setQuickTotalCount] = useState<number>();
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickError, setQuickError] = useState<TicketReadUnavailableReason>();
  const [detailedActive, setDetailedActive] = useState(false);
  const [detailedRows, setDetailedRows] = useState<WorkspaceTicketRow[]>([]);
  const [detailedTotalCount, setDetailedTotalCount] = useState<number>();
  const [detailedNextCursor, setDetailedNextCursor] = useState<string>();
  const [detailedLoading, setDetailedLoading] = useState(false);
  const [detailedError, setDetailedError] =
    useState<TicketReadUnavailableReason>();
  const [detailedQuery, setDetailedQuery] = useState("");
  const [sort, setSort] = useState<WorkspaceTicketListSort>();
  const quickGeneration = useRef(0);
  const detailedGeneration = useRef(0);
  const lastLoadedAt = useRef(0);
  const scopeInitialized = useRef(false);
  const previousStorageKey = useRef<string | undefined>(undefined);

  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);
    quickGeneration.current += 1;
    setQuickRows([]);
    setQuickTotalCount(undefined);
    setQuickError(undefined);
    setQuickLoading(false);
    if (scopedStorageKey) {
      if (nextQuery) {
        window.sessionStorage.setItem(scopedStorageKey, nextQuery);
      } else {
        window.sessionStorage.removeItem(scopedStorageKey);
      }
    }
    if (!nextQuery.trim()) {
      detailedGeneration.current += 1;
      setDetailedActive(false);
      setDetailedError(undefined);
    }
  }, [scopedStorageKey]);

  useEffect(() => {
    const restored = scopedStorageKey
      ? window.sessionStorage.getItem(scopedStorageKey) ?? ""
      : "";
    const initialScope = !scopeInitialized.current;
    const scopeChanged = previousStorageKey.current !== scopedStorageKey;
    scopeInitialized.current = true;
    previousStorageKey.current = scopedStorageKey;
    if (!scopeChanged || (initialScope && !restored)) {
      return;
    }
    const timeout = window.setTimeout(() => {
      quickGeneration.current += 1;
      detailedGeneration.current += 1;
      setQueryState(restored);
      setQuickRows([]);
      setQuickTotalCount(undefined);
      setQuickLoading(false);
      setQuickError(undefined);
      setDetailedActive(false);
      setDetailedRows([]);
      setDetailedTotalCount(undefined);
      setDetailedNextCursor(undefined);
      setDetailedLoading(false);
      setDetailedError(undefined);
      setDetailedQuery("");
      setSort(undefined);
      lastLoadedAt.current = 0;
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [scopedStorageKey]);

  const runQuickSearch = useCallback(async (
    searchQuery: string,
    generation: number,
  ) => {
    if (!action || !scopedStorageKey) return;
    setQuickLoading(true);
    setQuickError(undefined);
    const result = await action({ mode: "quick", query: searchQuery }).catch(
      () => undefined,
    );
    if (generation !== quickGeneration.current) return;
    setQuickLoading(false);
    if (!result || result.status === "unavailable") {
      setQuickError(result?.reason ?? "provider-temporary-failure");
      return;
    }
    setQuickRows(result.rows);
    setQuickTotalCount(result.totalCount);
    lastLoadedAt.current = Date.now();
  }, [action, scopedStorageKey]);

  useEffect(() => {
    const generation = ++quickGeneration.current;
    const validation = validateTicketSearchQuery(query);
    if (!action || !scopedStorageKey || validation.status === "invalid") {
      return;
    }
    const timeout = window.setTimeout(
      () => void runQuickSearch(validation.query, generation),
      quickSearchDelayMs,
    );
    return () => window.clearTimeout(timeout);
  }, [action, query, runQuickSearch, scopedStorageKey]);

  const loadDetailedFirstPage = useCallback(async (
    searchQuery: string,
    nextSort?: WorkspaceTicketListSort,
  ) => {
    if (!action || !scopedStorageKey) return;
    const generation = ++detailedGeneration.current;
    setDetailedActive(true);
    const validation = validateTicketSearchQuery(searchQuery);
    if (validation.status === "invalid") {
      setDetailedQuery(searchQuery.trim());
      setDetailedError("invalid-search-query");
      setDetailedLoading(false);
      return;
    }
    setDetailedLoading(true);
    setDetailedError(undefined);
    const result = await action({
      mode: "detailed",
      query: validation.query,
      ...(nextSort ? { sort: nextSort } : {}),
    }).catch(() => undefined);
    if (generation !== detailedGeneration.current) return;
    setDetailedLoading(false);
    if (!result || result.status === "unavailable") {
      setDetailedError(result?.reason ?? "provider-temporary-failure");
      return;
    }
    setDetailedQuery(validation.query);
    setDetailedRows(result.rows);
    setDetailedTotalCount(result.totalCount);
    setDetailedNextCursor(result.nextCursor);
    setSort(result.appliedSort ?? nextSort);
    lastLoadedAt.current = Date.now();
  }, [action, scopedStorageKey]);

  async function loadMore() {
    if (
      !action ||
      !scopedStorageKey ||
      !detailedNextCursor ||
      detailedLoading
    ) return;
    const generation = ++detailedGeneration.current;
    setDetailedLoading(true);
    setDetailedError(undefined);
    const result: WorkspaceTicketSearchResult | undefined = await action({
      mode: "detailed",
      query: detailedQuery,
      cursor: detailedNextCursor,
      ...(sort ? { sort } : {}),
    }).catch(() => undefined);
    if (generation !== detailedGeneration.current) return;
    setDetailedLoading(false);
    if (!result || result.status === "unavailable") {
      setDetailedError(result?.reason ?? "provider-temporary-failure");
      return;
    }
    setDetailedRows((current) => appendUniqueRows(current, result.rows));
    setDetailedNextCursor(result.nextCursor);
    setDetailedTotalCount(result.totalCount);
    lastLoadedAt.current = Date.now();
  }

  useEffect(() => {
    function refreshStaleSearch() {
      if (
        detailedActive &&
        detailedQuery &&
        Date.now() - lastLoadedAt.current >= searchStaleMs
      ) {
        void loadDetailedFirstPage(detailedQuery, sort);
      }
    }
    window.addEventListener("focus", refreshStaleSearch);
    return () => window.removeEventListener("focus", refreshStaleSearch);
  }, [detailedActive, detailedQuery, loadDetailedFirstPage, sort]);

  return {
    canLoadMore: Boolean(detailedNextCursor),
    clear: () => setQuery(""),
    detailedActive,
    detailedError,
    detailedLoading,
    detailedQuery,
    detailedRows,
    detailedTotalCount,
    enabled: Boolean(action && scopedStorageKey),
    loadMore,
    query,
    quickError,
    quickLoading,
    quickRows,
    quickTotalCount,
    refresh: () => void loadDetailedFirstPage(detailedQuery, sort),
    setQuery,
    sort,
    sortDirectionFor: (key: WorkspaceTicketListSort["key"]) =>
      sort?.key === key ? sort.direction : undefined,
    sortDetailed: (nextSort: WorkspaceTicketListSort) =>
      void loadDetailedFirstPage(detailedQuery || query, nextSort),
    toggleSort: (key: WorkspaceTicketListSort["key"]) => {
      const direction =
        sort?.key === key && sort.direction === "ascending"
          ? "descending"
          : "ascending";
      void loadDetailedFirstPage(detailedQuery || query, { key, direction });
    },
    submitDetailed: () => void loadDetailedFirstPage(query, sort),
  };
}

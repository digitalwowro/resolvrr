"use client";

import { useEffect, useRef, useState } from "react";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets/detail-action-result";

type TicketDetailCacheEntry = WorkspaceTicketDetailLoadResult | { status: "loading" };

type TicketDetailCache = Record<string, TicketDetailCacheEntry>;

type TicketDetailLoadedAtCache = Record<string, number>;

type TicketDetailLoaderProps = {
  initialDetailResult?: WorkspaceTicketDetailLoadResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  selectedTicketId?: string;
};

const clientLoadFailure: WorkspaceTicketDetailLoadResult = {
  status: "unavailable",
  reason: "provider-temporary-failure",
  retryable: true,
};

function initialDetailCache({
  initialDetailResult,
  selectedTicketId,
}: {
  initialDetailResult?: WorkspaceTicketDetailLoadResult;
  selectedTicketId?: string;
}): TicketDetailCache {
  if (!selectedTicketId || !initialDetailResult) {
    return {};
  }

  return {
    [selectedTicketId]: initialDetailResult,
  };
}

export function useTicketDetailLoader({
  initialDetailResult,
  loadTicketDetailAction,
  selectedTicketId,
}: TicketDetailLoaderProps) {
  const detailLoadedAtRef = useRef<TicketDetailLoadedAtCache>({});
  const inFlightRef = useRef(new Set<string>());
  const [detailCache, setDetailCacheState] = useState<TicketDetailCache>(
    () => initialDetailCache({ initialDetailResult, selectedTicketId }),
  );
  const [refreshingTicketIds, setRefreshingTicketIds] = useState<Set<string>>(
    () => new Set(),
  );

  useEffect(() => {
    if (
      selectedTicketId &&
      initialDetailResult &&
      detailLoadedAtRef.current[selectedTicketId] === undefined
    ) {
      detailLoadedAtRef.current = {
        ...detailLoadedAtRef.current,
        [selectedTicketId]: Date.now(),
      };
    }
  }, [initialDetailResult, selectedTicketId]);

  function cacheSelectedDetail() {
    if (!selectedTicketId || !initialDetailResult) {
      return;
    }

    setDetailCacheState((current) => {
      if (current[selectedTicketId] === initialDetailResult) {
        return current;
      }

      return {
        ...current,
        [selectedTicketId]: initialDetailResult,
      };
    });
  }

  function detailFor(ticketId?: string) {
    if (!ticketId) {
      return undefined;
    }

    return detailCache[ticketId] ??
      (ticketId === selectedTicketId ? initialDetailResult : undefined);
  }

  function loadTicketDetail(ticketId: string, { force }: { force: boolean }) {
    if (!force && detailCache[ticketId]) {
      return;
    }
    if (inFlightRef.current.has(ticketId)) {
      return;
    }

    const existingEntry = detailCache[ticketId];
    inFlightRef.current.add(ticketId);
    if (force && existingEntry && existingEntry.status !== "loading") {
      setRefreshingTicketIds((current) => new Set(current).add(ticketId));
    }
    setDetailCacheState((current) => {
      const currentEntry = current[ticketId];
      if (!force && currentEntry) {
        return current;
      }

      if (force && currentEntry && currentEntry.status !== "loading") {
        return current;
      }

      return {
        ...current,
        [ticketId]: { status: "loading" },
      };
    });

    const detailRequest = force
      ? loadTicketDetailAction(ticketId, { cacheMode: "bypass" })
      : loadTicketDetailAction(ticketId);

    void detailRequest
      .then((result) => {
        detailLoadedAtRef.current = {
          ...detailLoadedAtRef.current,
          [ticketId]: Date.now(),
        };
        setDetailCacheState((current) => ({
          ...current,
          [ticketId]: result,
        }));
      })
      .catch(() => {
        setDetailCacheState((current) => {
          const currentEntry = current[ticketId];
          return {
            ...current,
            [ticketId]:
              force && currentEntry && currentEntry.status !== "loading"
                ? currentEntry
                : clientLoadFailure,
          };
        });
      })
      .finally(() => {
        inFlightRef.current.delete(ticketId);
        setRefreshingTicketIds((current) => {
          if (!current.has(ticketId)) {
            return current;
          }
          const next = new Set(current);
          next.delete(ticketId);
          return next;
        });
      });
  }

  function ensureTicketDetail(ticketId: string) {
    loadTicketDetail(ticketId, { force: false });
  }

  function refreshTicketDetail(ticketId: string) {
    loadTicketDetail(ticketId, { force: true });
  }

  function isTicketDetailRefreshing(ticketId: string) {
    return refreshingTicketIds.has(ticketId);
  }

  function isTicketDetailStale(ticketId: string, staleMs: number) {
    const loadedAt = detailLoadedAtRef.current[ticketId];
    return loadedAt === undefined || Date.now() - loadedAt >= staleMs;
  }

  return {
    cacheSelectedDetail,
    detailFor,
    ensureTicketDetail,
    isTicketDetailRefreshing,
    isTicketDetailStale,
    refreshTicketDetail,
  };
}

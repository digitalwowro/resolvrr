"use client";

import { useEffect, useRef, useState } from "react";
import type {
  InitialTicketAiSummary,
  LoadWorkspaceTicketDetailHydrationAction,
  WorkspaceTicketDetailHydrationResult,
} from "@/features/workspace/ticket-detail-hydration";
import { withTicketDetailRequestTimeout } from "./ticket-detail-request-timeout";

type TicketDetailCacheEntry = WorkspaceTicketDetailHydrationResult | { status: "loading" };

type TicketDetailCache = Record<string, TicketDetailCacheEntry>;

type TicketDetailLoadedAtCache = Record<string, number>;

type TicketDetailLoaderProps = {
  initialDetailResult?: WorkspaceTicketDetailHydrationResult;
  loadTicketDetailAction: LoadWorkspaceTicketDetailHydrationAction;
  selectedTicketId?: string;
};

const clientLoadFailure: WorkspaceTicketDetailHydrationResult = {
  status: "unavailable",
  reason: "provider-temporary-failure",
  retryable: true,
};

function canReuseDetail(entry?: TicketDetailCacheEntry) {
  return Boolean(
    entry &&
      entry.status !== "loading" &&
      !(entry.status === "unavailable" && entry.retryable),
  );
}

function initialDetailCache({
  initialDetailResult,
  selectedTicketId,
}: {
  initialDetailResult?: WorkspaceTicketDetailHydrationResult;
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
      const existing = current[selectedTicketId];
      if (
        existing?.status === "available" &&
        initialDetailResult.status === "available"
      ) {
        const next = {
          ...initialDetailResult,
          initialTicketAiSummary:
            existing.initialTicketAiSummary ??
            initialDetailResult.initialTicketAiSummary,
          summaryHydrated:
            existing.summaryHydrated ?? initialDetailResult.summaryHydrated,
        };
        if (
          existing.detail === next.detail &&
          existing.initialTicketAiSummary === next.initialTicketAiSummary &&
          existing.summaryHydrated === next.summaryHydrated
        ) {
          return current;
        }
        return { ...current, [selectedTicketId]: next };
      }
      if (existing?.status === "available") {
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
    if (!force && canReuseDetail(detailCache[ticketId])) {
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
      if (!force && canReuseDetail(currentEntry)) {
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

    const detailRequest = withTicketDetailRequestTimeout(
      force
        ? loadTicketDetailAction(ticketId, { cacheMode: "bypass" })
        : loadTicketDetailAction(ticketId),
    );

    void detailRequest
      .then((result) => {
        detailLoadedAtRef.current = {
          ...detailLoadedAtRef.current,
          [ticketId]: Date.now(),
        };
        setDetailCacheState((current) => {
          const existing = current[ticketId];
          const next =
            result.status === "available" &&
            result.summaryHydrated !== true &&
            existing?.status === "available" &&
            existing.initialTicketAiSummary
              ? {
                  ...result,
                  initialTicketAiSummary: existing.initialTicketAiSummary,
                }
              : result;
          return { ...current, [ticketId]: next };
        });
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

  function setTicketAiSummary(
    ticketId: string,
    summary: InitialTicketAiSummary,
  ) {
    setDetailCacheState((current) => {
      const entry = current[ticketId];
      if (!entry || entry.status !== "available") return current;
      return {
        ...current,
        [ticketId]: {
          ...entry,
          initialTicketAiSummary: summary,
          summaryHydrated: true,
        },
      };
    });
  }

  function adoptResolvedDetail(
    sourceTicketIds: string[],
    targetTicketId: string,
    result: WorkspaceTicketDetailHydrationResult,
  ) {
    const loadedAt = Date.now();
    detailLoadedAtRef.current = {
      ...detailLoadedAtRef.current,
      ...Object.fromEntries(sourceTicketIds.map((ticketId) => [ticketId, loadedAt])),
      [targetTicketId]: loadedAt,
    };
    setDetailCacheState((current) => {
      const next = { ...current, [targetTicketId]: result };
      for (const sourceTicketId of sourceTicketIds) {
        if (sourceTicketId !== targetTicketId) {
          delete next[sourceTicketId];
        }
      }
      return next;
    });
  }

  return {
    adoptResolvedDetail,
    cacheSelectedDetail,
    detailFor,
    ensureTicketDetail,
    isTicketDetailRefreshing,
    isTicketDetailStale,
    refreshTicketDetail,
    setTicketAiSummary,
  };
}

"use client";

import { useState } from "react";
import type {
  LoadWorkspaceTicketDetailAction,
  WorkspaceTicketDetailLoadResult,
} from "@/features/tickets";

type TicketDetailCacheEntry = WorkspaceTicketDetailLoadResult | { status: "loading" };

type TicketDetailCache = Record<string, TicketDetailCacheEntry>;

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
  const [detailCache, setDetailCacheState] = useState<TicketDetailCache>(
    () => initialDetailCache({ initialDetailResult, selectedTicketId }),
  );

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

    setDetailCacheState((current) => {
      if (!force && current[ticketId]) {
        return current;
      }
      if (force && current[ticketId]?.status === "available") {
        return current;
      }

      return {
        ...current,
        [ticketId]: { status: "loading" },
      };
    });

    void loadTicketDetailAction(ticketId)
      .then((result) => {
        setDetailCacheState((current) => ({
          ...current,
          [ticketId]: result,
        }));
      })
      .catch(() => {
        setDetailCacheState((current) => ({
          ...current,
          [ticketId]: clientLoadFailure,
        }));
      });
  }

  function ensureTicketDetail(ticketId: string) {
    loadTicketDetail(ticketId, { force: false });
  }

  function refreshTicketDetail(ticketId: string) {
    loadTicketDetail(ticketId, { force: true });
  }

  return {
    cacheSelectedDetail,
    detailFor,
    ensureTicketDetail,
    refreshTicketDetail,
  };
}

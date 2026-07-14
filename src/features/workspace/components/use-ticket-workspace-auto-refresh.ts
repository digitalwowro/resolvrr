"use client";

import { useEffect } from "react";

type TicketWorkspaceAutoRefreshOptions = {
  activeTicketId?: string;
  isActiveTicketDetailStale(staleMs: number): boolean;
  isListRefreshAvailable: boolean;
  isListStale(staleMs: number): boolean;
  listActive: boolean;
  refreshActiveTicketDetail(): void;
  silentRefreshCurrentPage(): void | Promise<void>;
};

const ticketDetailSilentRefreshMs = 60_000;
const ticketListSilentRefreshMs = 120_000;

export function useTicketWorkspaceAutoRefresh({
  activeTicketId,
  isActiveTicketDetailStale,
  isListRefreshAvailable,
  isListStale,
  listActive,
  refreshActiveTicketDetail,
  silentRefreshCurrentPage,
}: TicketWorkspaceAutoRefreshOptions) {
  useEffect(() => {
    if (!listActive || !isListRefreshAvailable) {
      return;
    }

    function refreshVisibleListIfStale() {
      if (document.hidden || !isListStale(ticketListSilentRefreshMs)) {
        return;
      }
      void silentRefreshCurrentPage();
    }

    refreshVisibleListIfStale();
    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void silentRefreshCurrentPage();
      }
    }, ticketListSilentRefreshMs);
    document.addEventListener("visibilitychange", refreshVisibleListIfStale);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", refreshVisibleListIfStale);
    };
  }, [
    isListRefreshAvailable,
    isListStale,
    listActive,
    silentRefreshCurrentPage,
  ]);

  useEffect(() => {
    if (!activeTicketId) {
      return;
    }

    function refreshVisibleTicketIfStale() {
      if (
        document.hidden ||
        !isActiveTicketDetailStale(ticketDetailSilentRefreshMs)
      ) {
        return;
      }
      refreshActiveTicketDetail();
    }

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        refreshActiveTicketDetail();
      }
    }, ticketDetailSilentRefreshMs);
    document.addEventListener("visibilitychange", refreshVisibleTicketIfStale);

    return () => {
      window.clearInterval(intervalId);
      document.removeEventListener(
        "visibilitychange",
        refreshVisibleTicketIfStale,
      );
    };
  }, [activeTicketId, isActiveTicketDetailStale, refreshActiveTicketDetail]);
}

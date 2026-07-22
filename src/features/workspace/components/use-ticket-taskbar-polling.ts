"use client";

import { useEffect, useRef } from "react";
import type { TaskbarSyncRequest } from "@/features/taskbar-sync/model";

export function useTicketTaskbarPolling(
  enabled: boolean,
  scopeKey: string,
  initialSelectedTicketId: string | undefined,
  synchronize: (request: TaskbarSyncRequest) => Promise<void>,
) {
  const initializedSelections = useRef(new Set<string>());

  useEffect(() => {
    if (!enabled) return;
    const reconcile = () => { void synchronize({ kind: "reconcile" }); };
    const initial = window.setTimeout(() => {
      const selectionKey = initialSelectedTicketId
        ? `${scopeKey}:${initialSelectedTicketId}`
        : undefined;
      if (
        initialSelectedTicketId &&
        selectionKey &&
        !initializedSelections.current.has(selectionKey)
      ) {
        initializedSelections.current.add(selectionKey);
        void synchronize({
          kind: "activate",
          ticketExternalId: initialSelectedTicketId,
        });
      }
      reconcile();
    }, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") reconcile();
    }, 60_000);
    window.addEventListener("focus", reconcile);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", reconcile);
    };
  }, [enabled, initialSelectedTicketId, scopeKey, synchronize]);
}

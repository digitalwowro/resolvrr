"use client";

import { useEffect } from "react";
import type { TaskbarSyncRequest } from "@/features/taskbar-sync/model";

export function useTicketTaskbarPolling(
  enabled: boolean,
  scopeKey: string,
  synchronize: (request: TaskbarSyncRequest) => Promise<void>,
) {
  useEffect(() => {
    if (!enabled) return;
    const reconcile = () => { void synchronize({ kind: "reconcile" }); };
    const initial = window.setTimeout(reconcile, 0);
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") reconcile();
    }, 60_000);
    window.addEventListener("focus", reconcile);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener("focus", reconcile);
    };
  }, [enabled, scopeKey, synchronize]);
}

"use client";

import { useCallback } from "react";
import type { RefObject } from "react";
import type { TaskbarSyncRequest } from "@/features/taskbar-sync/model";
import type { TicketTaskbarRuntime } from "./ticket-taskbar-runtime";
import {
  taskbarRuntimeFor,
  TASKBAR_CLOSE_ECHO_WINDOW_MS,
} from "./ticket-taskbar-runtime";

type SynchronizeTaskbar = (request: TaskbarSyncRequest) => Promise<void>;

export function useTicketTaskbarControls(
  runtimes: RefObject<Map<string, TicketTaskbarRuntime>>,
  scopeKey: RefObject<string>,
  synchronize: SynchronizeTaskbar,
) {
  const clearRecentClose = useCallback((ticketExternalId: string) => {
    const runtime = taskbarRuntimeFor(runtimes.current, scopeKey.current);
    runtime.locallyClosedIds.delete(ticketExternalId);
    runtime.recentlyClosedUntil.delete(ticketExternalId);
  }, [runtimes, scopeKey]);

  const activate = useCallback((ticketExternalId: string) => {
    clearRecentClose(ticketExternalId);
    return synchronize({ kind: "activate", ticketExternalId });
  }, [clearRecentClose, synchronize]);

  const close = useCallback((ticketExternalId: string) => {
    const runtime = taskbarRuntimeFor(runtimes.current, scopeKey.current);
    runtime.locallyClosedIds.add(ticketExternalId);
    runtime.recentlyClosedUntil.set(
      ticketExternalId,
      Date.now() + TASKBAR_CLOSE_ECHO_WINDOW_MS,
    );
    return synchronize({ kind: "close", ticketExternalId });
  }, [runtimes, scopeKey, synchronize]);

  const open = useCallback((ticketExternalId: string) => {
    clearRecentClose(ticketExternalId);
    return synchronize({ kind: "open", ticketExternalId });
  }, [clearRecentClose, synchronize]);

  return {
    activate,
    close,
    deactivate: () => synchronize({ kind: "deactivate" }),
    open,
    reorder: (ticketExternalIds: string[]) =>
      synchronize({ kind: "reorder", ticketExternalIds }),
  };
}

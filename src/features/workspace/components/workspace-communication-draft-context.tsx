"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import type {
  CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";
import {
  WorkspaceCommunicationDraftController,
  type WorkspaceCommunicationDraftEntry,
} from "./workspace-communication-draft-controller";
const DraftControllerContext =
  createContext<WorkspaceCommunicationDraftController | null>(null);
const noDraftEntry: WorkspaceCommunicationDraftEntry = {
  loaded: true,
  status: "local-only" as const,
};
const pendingDraftEntry: WorkspaceCommunicationDraftEntry = {
  loaded: false,
  status: "local-only" as const,
};

type BaseScope = Omit<
  CommunicationDraftPersistenceScope,
  "ticketExternalId"
>;

export function WorkspaceCommunicationDraftProvider({
  children,
  scope,
}: {
  children: ReactNode;
  scope?: BaseScope;
}) {
  const controller = useMemo(
    () => scope
      ? new WorkspaceCommunicationDraftController(scope)
      : null,
    [scope],
  );
  useEffect(() => {
    if (!controller) return;
    const flush = () => { void controller.flushAll(); };
    const flushWhenHidden = () => {
      if (document.visibilityState === "hidden") flush();
    };
    document.addEventListener("visibilitychange", flushWhenHidden);
    window.addEventListener("pagehide", flush);
    return () => {
      document.removeEventListener("visibilitychange", flushWhenHidden);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [controller]);
  return (
    <DraftControllerContext.Provider value={controller}>
      {children}
    </DraftControllerContext.Provider>
  );
}

export function useWorkspaceCommunicationDraftController() {
  return useContext(DraftControllerContext);
}

export function useWorkspaceCommunicationDraft(ticketExternalId: string) {
  const controller = useWorkspaceCommunicationDraftController();
  const entry = useSyncExternalStore(
    (listener) => controller?.subscribe(ticketExternalId, listener) ?? (() => {}),
    () => controller?.snapshot(ticketExternalId) ?? noDraftEntry,
    () => pendingDraftEntry,
  );
  useEffect(() => {
    if (controller) void controller.load(ticketExternalId);
  }, [controller, ticketExternalId]);
  return { controller, entry };
}

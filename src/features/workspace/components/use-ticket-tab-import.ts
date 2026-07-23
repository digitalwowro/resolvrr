"use client";

import { useLayoutEffect, useRef, useState } from "react";
import type { HydrateWorkspaceTabImportAction } from "@/features/tab-import/model";
import type { WorkspaceTabImportResult } from "@/features/tab-import/model";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { workspaceOpenTabsLimit } from "@/features/workspace/workspace-tab-state";
import { hydrateImportedTicketTabs } from "./ticket-tab-import-hydration";

export type ImportWorkspaceTicketTabsAction = (
  helpdeskConnectionId?: unknown,
  identityVersion?: unknown,
) => Promise<WorkspaceTabImportResult>;

export type TicketTabImportNotice = {
  message: string;
  tone: "error" | "success";
};

function unavailableMessage(result: Extract<
  WorkspaceTabImportResult,
  { status: "unavailable" }
>) {
  if (
    result.reason === "tab-import-incompatible" ||
    result.reason === "unsupported-capability"
  ) {
    return "This helpdesk version does not support ticket-tab import.";
  }
  if (result.reason === "provider-auth-failed") {
    return "Your helpdesk connection needs attention before tabs can be imported.";
  }
  return result.retryable
    ? "Ticket tabs could not be read. Try Sync tabs again."
    : "Ticket tabs are unavailable for this connection.";
}

export function useTicketTabImport({
  action,
  hydrateAction,
  helpdeskConnectionId,
  identityVersion,
  importOpenTicketTabs,
  openTicketTabs,
  workspaceId,
}: {
  action?: ImportWorkspaceTicketTabsAction;
  hydrateAction?: HydrateWorkspaceTabImportAction;
  helpdeskConnectionId?: string;
  identityVersion?: string;
  importOpenTicketTabs(tabs: WorkspaceTicketTab[]): void;
  openTicketTabs: WorkspaceTicketTab[];
  workspaceId?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<TicketTabImportNotice>();
  const openTicketTabsRef = useRef(openTicketTabs);
  const importGenerationRef = useRef(0);
  const importingRef = useRef(false);
  const importScopeRef = useRef({
    helpdeskConnectionId,
    identityVersion,
    workspaceId,
  });
  useLayoutEffect(() => {
    openTicketTabsRef.current = openTicketTabs;
  }, [openTicketTabs]);
  useLayoutEffect(() => {
    const previousScope = importScopeRef.current;
    if (
      previousScope.helpdeskConnectionId === helpdeskConnectionId &&
      previousScope.identityVersion === identityVersion &&
      previousScope.workspaceId === workspaceId
    ) return;
    importScopeRef.current = {
      helpdeskConnectionId,
      identityVersion,
      workspaceId,
    };
    importGenerationRef.current += 1;
    importingRef.current = false;
    setLoading(false);
    setNotice(undefined);
  }, [helpdeskConnectionId, identityVersion, workspaceId]);
  useLayoutEffect(() => () => {
    importGenerationRef.current += 1;
    importingRef.current = false;
  }, []);
  const available = Boolean(
    action &&
    hydrateAction &&
    helpdeskConnectionId &&
    identityVersion &&
    workspaceId,
  );

  async function importTabs() {
    if (
      !action ||
      !hydrateAction ||
      !helpdeskConnectionId ||
      !identityVersion ||
      !workspaceId ||
      importingRef.current
    ) return;
    const capacity = workspaceOpenTabsLimit - openTicketTabs.length;
    if (capacity <= 0) {
      setNotice({
        message: `No tabs were imported because the ${workspaceOpenTabsLimit}-tab limit is reached.`,
        tone: "error",
      });
      return;
    }

    importingRef.current = true;
    const generation = importGenerationRef.current + 1;
    importGenerationRef.current = generation;
    const isCurrent = () => importGenerationRef.current === generation;
    setLoading(true);
    setNotice(undefined);
    try {
      const result = await action(helpdeskConnectionId, identityVersion);
      if (!isCurrent()) return;
      if (result.status === "unavailable") {
        setNotice({ message: unavailableMessage(result), tone: "error" });
        return;
      }
      const localIds = new Set(openTicketTabs.map((tab) => tab.id));
      const candidates = [...new Set(
        result.ticketExternalIds.filter((id) => !localIds.has(id)),
      )];
      if (candidates.length === 0) {
        setNotice({ message: "All Zammad ticket tabs are already open.", tone: "success" });
        return;
      }
      const hydrated = await hydrateImportedTicketTabs({
        candidateTicketIds: candidates,
        capacity,
        hydrateAction,
        hydrationScope: {
          helpdeskConnectionId,
          identityVersion,
          workspaceId,
        },
        knownTicketIds: localIds,
        shouldContinue: isCurrent,
      });
      if (!isCurrent()) return;
      const latestIds = new Set(
        openTicketTabsRef.current.map((tab) => tab.id),
      );
      const latestCapacity = Math.max(
        0,
        workspaceOpenTabsLimit - openTicketTabsRef.current.length,
      );
      const newTabs = hydrated.tabs.filter((tab) => !latestIds.has(tab.id));
      const tabsToImport = newTabs.slice(0, latestCapacity);
      if (tabsToImport.length > 0) importOpenTicketTabs(tabsToImport);
      const scannedCandidateCount =
        candidates.length - hydrated.scanLimitSkippedCount;
      const skippedForCapacity = Math.max(
        0,
        (hydrated.failure
          ? 0
          : scannedCandidateCount - hydrated.attemptedCount) +
          newTabs.length - tabsToImport.length,
      );
      const deduplicatedCount = hydrated.duplicateCount +
        hydrated.tabs.length - newTabs.length;
      const details = [
        hydrated.unavailableCount > 0
          ? `${hydrated.unavailableCount} unavailable`
          : undefined,
        skippedForCapacity > 0
          ? `${skippedForCapacity} skipped because the starting tab capacity was exhausted`
          : undefined,
        hydrated.scanLimitSkippedCount > 0
          ? `${hydrated.scanLimitSkippedCount} skipped because the import scan limit was reached`
          : undefined,
        deduplicatedCount > 0
          ? `${deduplicatedCount} duplicate${deduplicatedCount === 1 ? "" : "s"}`
          : undefined,
      ].filter(Boolean);
      const importCount = tabsToImport.length;
      setNotice({
        message: hydrated.failure
          ? `${importCount > 0
            ? `Imported ${importCount} ticket tab${importCount === 1 ? "" : "s"} before the import stopped`
            : "No ticket tabs were imported"}${details.length ? `; ${details.join(", ")}` : ""}. ${unavailableMessage(hydrated.failure)}`
          : importCount > 0
            ? `Imported ${importCount} ticket tab${importCount === 1 ? "" : "s"}${details.length ? `; ${details.join(", ")}` : ""}.`
            : `No ticket tabs were imported${details.length ? `; ${details.join(", ")}` : ""}.`,
        tone: hydrated.failure || importCount === 0 ? "error" : "success",
      });
    } catch {
      if (!isCurrent()) return;
      setNotice({
        message: "Ticket tabs could not be imported. Try Sync tabs again.",
        tone: "error",
      });
    } finally {
      if (isCurrent()) {
        importingRef.current = false;
        setLoading(false);
      }
    }
  }

  return { available, importTabs, loading, notice };
}

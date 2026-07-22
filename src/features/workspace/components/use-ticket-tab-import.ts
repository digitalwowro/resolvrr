"use client";

import { useEffect, useRef, useState } from "react";
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
  useEffect(() => {
    openTicketTabsRef.current = openTicketTabs;
  }, [openTicketTabs]);
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
      loading
    ) return;
    const capacity = workspaceOpenTabsLimit - openTicketTabs.length;
    if (capacity <= 0) {
      setNotice({
        message: `No tabs were imported because the ${workspaceOpenTabsLimit}-tab limit is reached.`,
        tone: "error",
      });
      return;
    }

    setLoading(true);
    setNotice(undefined);
    try {
      const result = await action(helpdeskConnectionId, identityVersion);
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
        capacity: workspaceOpenTabsLimit,
        hydrateAction,
        hydrationScope: {
          helpdeskConnectionId,
          identityVersion,
          workspaceId,
        },
        knownTicketIds: localIds,
      });
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
        scannedCandidateCount - hydrated.attemptedCount +
          newTabs.length - tabsToImport.length,
      );
      const deduplicatedCount = Math.max(
        0,
        hydrated.attemptedCount -
          hydrated.unavailableCount -
          newTabs.length,
      );
      const details = [
        hydrated.unavailableCount > 0
          ? `${hydrated.unavailableCount} unavailable`
          : undefined,
        skippedForCapacity > 0
          ? `${skippedForCapacity} skipped because the tab limit was reached`
          : undefined,
        hydrated.scanLimitSkippedCount > 0
          ? `${hydrated.scanLimitSkippedCount} skipped because the import scan limit was reached`
          : undefined,
        deduplicatedCount > 0
          ? `${deduplicatedCount} duplicate${deduplicatedCount === 1 ? "" : "s"}`
          : undefined,
      ].filter(Boolean);
      setNotice({
        message: tabsToImport.length > 0
          ? `Imported ${tabsToImport.length} ticket tab${tabsToImport.length === 1 ? "" : "s"}${details.length ? `; ${details.join(", ")}` : ""}.`
          : `No ticket tabs were imported${details.length ? `; ${details.join(", ")}` : ""}.`,
        tone: tabsToImport.length > 0 ? "success" : "error",
      });
    } catch {
      setNotice({
        message: "Ticket tabs could not be imported. Try Sync tabs again.",
        tone: "error",
      });
    } finally {
      setLoading(false);
    }
  }

  return { available, importTabs, loading, notice };
}

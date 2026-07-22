"use client";

import { useState } from "react";
import type { WorkspaceTabImportResult } from "@/features/tab-import/model";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import type { LoadWorkspaceTicketDetailHydrationAction } from "@/features/workspace/ticket-detail-hydration";
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
  helpdeskConnectionId,
  identityVersion,
  importOpenTicketTabs,
  loadTicketDetailAction,
  openTicketTabs,
}: {
  action?: ImportWorkspaceTicketTabsAction;
  helpdeskConnectionId?: string;
  identityVersion?: string;
  importOpenTicketTabs(tabs: WorkspaceTicketTab[]): void;
  loadTicketDetailAction: LoadWorkspaceTicketDetailHydrationAction;
  openTicketTabs: WorkspaceTicketTab[];
}) {
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<TicketTabImportNotice>();
  const available = Boolean(action && helpdeskConnectionId && identityVersion);

  async function importTabs() {
    if (!action || !helpdeskConnectionId || !identityVersion || loading) return;
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
      const candidates = result.ticketExternalIds.filter((id) => !localIds.has(id));
      if (candidates.length === 0) {
        setNotice({ message: "All Zammad ticket tabs are already open.", tone: "success" });
        return;
      }
      const hydrated = await hydrateImportedTicketTabs({
        candidateTicketIds: candidates,
        capacity,
        knownTicketIds: localIds,
        loadTicketDetailAction,
      });
      importOpenTicketTabs(hydrated.tabs);
      const skippedForCapacity = Math.max(
        0,
        candidates.length - hydrated.attemptedCount,
      );
      const details = [
        hydrated.unavailableCount > 0
          ? `${hydrated.unavailableCount} unavailable`
          : undefined,
        skippedForCapacity > 0
          ? `${skippedForCapacity} skipped because the tab limit was reached`
          : undefined,
      ].filter(Boolean);
      setNotice({
        message: hydrated.tabs.length > 0
          ? `Imported ${hydrated.tabs.length} ticket tab${hydrated.tabs.length === 1 ? "" : "s"}${details.length ? `; ${details.join(", ")}` : ""}.`
          : `No ticket tabs were imported${details.length ? `; ${details.join(", ")}` : ""}.`,
        tone: hydrated.tabs.length > 0 ? "success" : "error",
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

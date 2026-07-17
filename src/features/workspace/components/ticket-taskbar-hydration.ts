import type { LoadWorkspaceTicketDetailAction } from "@/features/tickets/detail-action-result";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { workspaceTabFromDetail } from "@/features/workspace/workspace-tab-state";
import type { LocalTaskbarRequest } from "./ticket-taskbar-sync-requests";

type HydrationOptions = {
  activeProviderTicketId?: string;
  correctedSourceIds: Set<string>;
  knownTabs: Map<string, WorkspaceTicketTab>;
  loadTicketDetailAction: LoadWorkspaceTicketDetailAction;
  providerTicketIds: string[];
  replacements: Map<string, string>;
};

function uniqueCorrections(commands: LocalTaskbarRequest[]) {
  const keys = new Set<string>();
  return commands.filter((command) => {
    const key = command.kind === "reorder"
      ? `reorder:${command.ticketExternalIds.join(",")}`
      : command.kind === "deactivate"
        ? "deactivate"
        : `${command.kind}:${command.ticketExternalId}`;
    if (keys.has(key)) return false;
    keys.add(key);
    return true;
  });
}

export async function hydrateTaskbarTabs({
  activeProviderTicketId,
  correctedSourceIds,
  knownTabs,
  loadTicketDetailAction,
  providerTicketIds,
  replacements,
}: HydrationOptions) {
  const providerIds = new Set(providerTicketIds);
  const corrections: LocalTaskbarRequest[] = [];
  const tabs: WorkspaceTicketTab[] = [];
  const tabIds = new Set<string>();

  for (const providerTicketId of providerTicketIds) {
    const knownId = replacements.get(providerTicketId) ?? providerTicketId;
    if (knownId !== providerTicketId && !correctedSourceIds.has(providerTicketId)) {
      if (activeProviderTicketId === providerTicketId) {
        corrections.push({ kind: "activate", ticketExternalId: knownId });
      } else if (!providerIds.has(knownId)) {
        corrections.push({ kind: "open", ticketExternalId: knownId });
      } else {
        correctedSourceIds.add(providerTicketId);
        corrections.push({ kind: "close", ticketExternalId: providerTicketId });
      }
    }
    let tab = knownTabs.get(knownId);
    if (!tab) {
      const result = await loadTicketDetailAction(knownId);
      if (result.status === "retired") {
        if (!correctedSourceIds.has(providerTicketId)) {
          correctedSourceIds.add(providerTicketId);
          corrections.push({ kind: "close", ticketExternalId: providerTicketId });
        }
        continue;
      }
      if (result.status !== "available") continue;
      const hydratedTab = workspaceTabFromDetail(result.detail);
      tab = hydratedTab;
      if (result.resolution && hydratedTab.id !== providerTicketId) {
        const sourceIds = new Set([
          providerTicketId,
          ...result.resolution.sources.map((source) => source.externalId),
        ]);
        for (const sourceId of sourceIds) replacements.set(sourceId, hydratedTab.id);
        const uncorrectedSources = [...sourceIds].filter((sourceId) =>
          providerIds.has(sourceId) &&
          sourceId !== hydratedTab.id &&
          !correctedSourceIds.has(sourceId)
        );
        if (uncorrectedSources.length > 0) {
          const activeSource = uncorrectedSources.includes(
            activeProviderTicketId ?? "",
          );
          if (activeSource) {
            corrections.push({ kind: "activate", ticketExternalId: hydratedTab.id });
          } else if (!providerIds.has(hydratedTab.id)) {
            corrections.push({ kind: "open", ticketExternalId: hydratedTab.id });
          } else {
            for (const sourceId of uncorrectedSources) {
              correctedSourceIds.add(sourceId);
              corrections.push({ kind: "close", ticketExternalId: sourceId });
            }
          }
        }
      }
    }
    if (!tabIds.has(tab.id)) {
      tabs.push(tab);
      tabIds.add(tab.id);
    }
  }

  if (corrections.length > 0 && tabs.length > 0) {
    corrections.push({
      kind: "reorder",
      ticketExternalIds: tabs.map((tab) => tab.id),
    });
  }
  return {
    activeTicketId: activeProviderTicketId
      ? replacements.get(activeProviderTicketId) ?? activeProviderTicketId
      : undefined,
    corrections: uniqueCorrections(corrections),
    tabs,
  };
}

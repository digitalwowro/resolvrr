import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import {
  cappedWorkspaceTabs,
  workspaceTabFromDetail,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import type {
  ActiveWorkspacePane,
  TicketWorkspaceStateProps,
} from "./ticket-workspace-state-types";

function hydratedTab(
  tab: WorkspaceTicketTab,
  candidateTabs: WorkspaceTicketTab[],
): WorkspaceTicketTab {
  return candidateTabs.find((candidate) => candidate.id === tab.id) ?? tab;
}

function hydratedTabs(
  tabs: WorkspaceTicketTab[],
  candidateTabs: WorkspaceTicketTab[],
): WorkspaceTicketTab[] {
  return cappedWorkspaceTabs(tabs.map((tab) => hydratedTab(tab, candidateTabs)));
}

function selectedTicketTab({
  detail,
  selectedTicketId,
  ticketTabs,
}: {
  detail: TicketWorkspaceStateProps["detail"];
  selectedTicketId?: string;
  ticketTabs: WorkspaceTicketTab[];
}): WorkspaceTicketTab | undefined {
  if (!selectedTicketId) {
    return undefined;
  }
  if (detail?.id === selectedTicketId) {
    return workspaceTabFromDetail(detail);
  }
  return ticketTabs.find((tab) => tab.id === selectedTicketId);
}

function openTabsWithSelected(
  openTabs: WorkspaceTicketTab[],
  selectedTab: WorkspaceTicketTab | undefined,
): WorkspaceTicketTab[] {
  if (!selectedTab) {
    return cappedWorkspaceTabs(openTabs);
  }

  let found = false;
  const nextTabs = openTabs.map((tab) => {
    if (tab.id !== selectedTab.id) {
      return tab;
    }
    found = true;
    return selectedTab;
  });

  return cappedWorkspaceTabs(found ? nextTabs : [selectedTab, ...nextTabs]);
}

export function initialOpenTicketTabs({
  detail,
  initialWorkspaceOpenTabsState,
  selectedTicketId,
  ticketTabs,
}: Pick<
  TicketWorkspaceStateProps,
  "detail" | "initialWorkspaceOpenTabsState" | "selectedTicketId" | "ticketTabs"
>): WorkspaceTicketTab[] {
  return openTabsWithSelected(
    hydratedTabs(initialWorkspaceOpenTabsState?.openTabs ?? [], ticketTabs),
    selectedTicketTab({ detail, selectedTicketId, ticketTabs }),
  );
}

export function initialRecentTicketTabs({
  detail,
  initialWorkspaceOpenTabsState,
  selectedTicketId,
  ticketTabs,
}: Pick<
  TicketWorkspaceStateProps,
  "detail" | "initialWorkspaceOpenTabsState" | "selectedTicketId" | "ticketTabs"
>): WorkspaceTicketTab[] {
  const selectedTab = selectedTicketTab({ detail, selectedTicketId, ticketTabs });
  return cappedWorkspaceTabs(
    selectedTab
      ? [
          selectedTab,
          ...hydratedTabs(
            initialWorkspaceOpenTabsState?.recentTabs ?? [],
            ticketTabs,
          ).filter((tab) => tab.id !== selectedTab.id),
        ]
      : hydratedTabs(initialWorkspaceOpenTabsState?.recentTabs ?? [], ticketTabs),
  );
}

export function initialActiveWorkspacePane({
  initialWorkspaceOpenTabsState,
  openTicketTabs,
  selectedTicketId,
}: {
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  openTicketTabs: WorkspaceTicketTab[];
  selectedTicketId?: string;
}): ActiveWorkspacePane {
  if (
    selectedTicketId &&
    openTicketTabs.some((tab) => tab.id === selectedTicketId)
  ) {
    return { ticketId: selectedTicketId };
  }

  const persistedActivePane = initialWorkspaceOpenTabsState?.activePane;
  if (
    persistedActivePane &&
    persistedActivePane !== "list" &&
    openTicketTabs.some((tab) => tab.id === persistedActivePane)
  ) {
    return { ticketId: persistedActivePane };
  }

  return "list";
}

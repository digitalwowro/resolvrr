"use client";

import { useState } from "react";
import type {
  WorkspaceTicketDetail,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import {
  cappedWorkspaceTabs,
  workspaceTabFromDetail,
  type SaveWorkspaceOpenTabsStateAction,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import type { TicketMetadataSavedPatch } from "./metadata-draft";
import { patchTicketTabMetadata } from "./ticket-tab-metadata";
import type { TicketTabOrientation } from "./ticket-tabs-panel";
import {
  initialActiveWorkspacePane,
  initialOpenTicketTabs,
  initialRecentTicketTabs,
} from "./ticket-workspace-persisted-tabs";
import type { ActiveWorkspacePane } from "./ticket-workspace-state-types";
import { replaceWorkspaceUrl } from "./workspace-url";
import {
  reorderedTicketTabs,
  sameTicketTabs,
  ticketTabsWithOpenedTicket,
} from "./ticket-workspace-tab-reconciliation";
import { useWorkspaceTabsPersistence } from "./use-workspace-tabs-persistence";

type UseTicketWorkspaceTabsStateOptions = {
  cacheSelectedDetail(): void;
  detail?: WorkspaceTicketDetail;
  ensureTicketDetail(ticketId: string): void;
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  selectedTicketId?: string;
  ticketTabs: WorkspaceTicketTab[];
  workspaceId?: string;
};

export function useTicketWorkspaceTabsState({
  cacheSelectedDetail,
  detail,
  ensureTicketDetail,
  initialWorkspaceOpenTabsState,
  saveWorkspaceOpenTabsStateAction,
  selectedTicketId,
  ticketTabs,
  workspaceId,
}: UseTicketWorkspaceTabsStateOptions) {
  const [tabOrientation, setTabOrientation] =
    useState<TicketTabOrientation>(
      initialWorkspaceOpenTabsState?.tabOrientation ?? "horizontal",
    );
  const [openTicketTabs, setOpenTicketTabs] = useState<WorkspaceTicketTab[]>(
    () =>
      initialOpenTicketTabs({
        detail,
        initialWorkspaceOpenTabsState,
        selectedTicketId,
        ticketTabs,
      }),
  );
  const [recentTicketTabs, setRecentTicketTabs] = useState<WorkspaceTicketTab[]>(
    () =>
      initialRecentTicketTabs({
        detail,
        initialWorkspaceOpenTabsState,
        selectedTicketId,
        ticketTabs,
      }),
  );
  const [activeWorkspacePane, setActiveWorkspacePane] =
    useState<ActiveWorkspacePane>(() =>
      initialActiveWorkspacePane({
        initialWorkspaceOpenTabsState,
        openTicketTabs,
        selectedTicketId,
      }),
    );
  const activeTicketId =
    activeWorkspacePane === "list" ? undefined : activeWorkspacePane.ticketId;
  const listActive = activeWorkspacePane === "list";

  useWorkspaceTabsPersistence({
    activeTicketId,
    initialState: initialWorkspaceOpenTabsState,
    openTicketTabs,
    recentTicketTabs,
    saveAction: saveWorkspaceOpenTabsStateAction,
    selectedTicketId,
    tabOrientation,
    workspaceId,
  });

  function updateOpenTicketTabMetadata(patch: TicketMetadataSavedPatch) {
    setOpenTicketTabs((current) => patchTicketTabMetadata(current, patch));
    setRecentTicketTabs((current) => patchTicketTabMetadata(current, patch));
  }

  function replaceMergedTicket(
    sourceTicketIds: string[],
    targetDetail: WorkspaceTicketDetail,
  ) {
    const sourceIds = new Set(sourceTicketIds);
    const targetTab = workspaceTabFromDetail(targetDetail);
    const replaceTabs = (tabs: WorkspaceTicketTab[]) => {
      const firstSourceIndex = tabs.findIndex((tab) => sourceIds.has(tab.id));
      const withoutSourcesOrTarget = tabs.filter(
        (tab) => !sourceIds.has(tab.id) && tab.id !== targetTab.id,
      );
      const targetIndex = firstSourceIndex < 0
        ? 0
        : Math.min(firstSourceIndex, withoutSourcesOrTarget.length);
      withoutSourcesOrTarget.splice(targetIndex, 0, targetTab);
      return cappedWorkspaceTabs(withoutSourcesOrTarget);
    };

    setOpenTicketTabs(replaceTabs);
    setRecentTicketTabs((current) =>
      cappedWorkspaceTabs([
        targetTab,
        ...current.filter(
          (tab) => !sourceIds.has(tab.id) && tab.id !== targetTab.id,
        ),
      ]),
    );
    if (
      activeWorkspacePane !== "list" &&
      (sourceIds.has(activeWorkspacePane.ticketId) ||
        activeWorkspacePane.ticketId === targetTab.id)
    ) {
      if (sourceIds.has(activeWorkspacePane.ticketId)) {
        setActiveWorkspacePane({ ticketId: targetTab.id });
      }
      replaceWorkspaceUrl(targetTab.id);
    }
  }

  function rememberOpenTicket(ticketId: string) {
    const tab = ticketTabs.find((ticketTab) => ticketTab.id === ticketId) ??
      openTicketTabs.find((ticketTab) => ticketTab.id === ticketId);
    if (!tab) {
      return;
    }

    setOpenTicketTabs((current) =>
      current.some((currentTab) => currentTab.id === ticketId)
        ? current
        : ticketTabsWithOpenedTicket(current, tab),
    );
    setRecentTicketTabs((current) =>
      [tab, ...current.filter((currentTab) => currentTab.id !== ticketId)].slice(
        0,
        8,
      ),
    );
  }

  function showTicketFromRow(ticketId: string) {
    cacheSelectedDetail();
    rememberOpenTicket(ticketId);
    setActiveWorkspacePane({ ticketId });
    replaceWorkspaceUrl(ticketId);
    ensureTicketDetail(ticketId);
  }

  function showList() {
    cacheSelectedDetail();
    setActiveWorkspacePane("list");
    replaceWorkspaceUrl();
  }

  function returnActiveTicketToList() {
    cacheSelectedDetail();
    if (activeTicketId) {
      setOpenTicketTabs((current) =>
        current.filter((tab) => tab.id !== activeTicketId),
      );
    }
    setActiveWorkspacePane("list");
    replaceWorkspaceUrl();
  }

  function showOpenTicket(ticketId: string) {
    cacheSelectedDetail();
    rememberOpenTicket(ticketId);
    setActiveWorkspacePane({ ticketId });
    replaceWorkspaceUrl(ticketId);
    ensureTicketDetail(ticketId);
  }

  function showNotificationTicket(tab: WorkspaceTicketTab) {
    const ticketId = tab.id;
    const hydratedTab =
      ticketTabs.find((ticketTab) => ticketTab.id === ticketId) ??
      openTicketTabs.find((ticketTab) => ticketTab.id === ticketId) ??
      tab;

    cacheSelectedDetail();
    setOpenTicketTabs((current) =>
      cappedWorkspaceTabs(
        current.some((currentTab) => currentTab.id === ticketId)
          ? current
          : [hydratedTab, ...current],
      ),
    );
    setRecentTicketTabs((current) =>
      cappedWorkspaceTabs([
        hydratedTab,
        ...current.filter((currentTab) => currentTab.id !== ticketId),
      ]),
    );
    setActiveWorkspacePane({ ticketId });
    replaceWorkspaceUrl(ticketId);
    ensureTicketDetail(ticketId);
  }

  function closeTicket(ticketId: string) {
    cacheSelectedDetail();
    const closingIndex = openTicketTabs.findIndex((tab) => tab.id === ticketId);
    if (closingIndex === -1) {
      return;
    }

    const next = openTicketTabs.filter((tab) => tab.id !== ticketId);
    setOpenTicketTabs(next);

    if (activeTicketId === ticketId) {
      const nextActive = next[closingIndex] ?? next[closingIndex - 1];
      if (nextActive) {
        setActiveWorkspacePane({ ticketId: nextActive.id });
        replaceWorkspaceUrl(nextActive.id);
      } else {
        setActiveWorkspacePane("list");
        replaceWorkspaceUrl();
      }
    }
  }

  function reorderOpenTicketTabs(sourceTicketId: string, targetIndex: number) {
    setOpenTicketTabs((current) => reorderedTicketTabs(current, sourceTicketId, targetIndex));
  }

  function importOpenTicketTabs(importedTabs: WorkspaceTicketTab[]) {
    setOpenTicketTabs((current) => {
      const currentIds = new Set(current.map((tab) => tab.id));
      const next = cappedWorkspaceTabs([
        ...current,
        ...importedTabs.filter((tab) => !currentIds.has(tab.id)),
      ]);
      return sameTicketTabs(current, next) ? current : next;
    });
    setRecentTicketTabs((current) => {
      const currentIds = new Set(current.map((tab) => tab.id));
      const next = cappedWorkspaceTabs([
        ...current,
        ...importedTabs.filter((tab) => !currentIds.has(tab.id)),
      ]);
      return sameTicketTabs(current, next) ? current : next;
    });
  }

  return {
    activeTicketId,
    closeTicket,
    listActive,
    openTicketTabs,
    recentTicketTabs,
    importOpenTicketTabs,
    replaceMergedTicket,
    reorderOpenTicketTabs,
    returnActiveTicketToList,
    setTabOrientation,
    showList,
    showNotificationTicket,
    showOpenTicket,
    showTicketFromRow,
    tabOrientation,
    updateOpenTicketTabMetadata,
  };
}

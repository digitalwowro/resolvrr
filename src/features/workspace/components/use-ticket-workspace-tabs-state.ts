"use client";

import { useEffect, useState } from "react";
import type {
  WorkspaceTicketDetail,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import {
  cappedWorkspaceTabs,
  workspaceOpenTabsStateVersion,
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

type UseTicketWorkspaceTabsStateOptions = {
  cacheSelectedDetail(): void;
  detail?: WorkspaceTicketDetail;
  ensureTicketDetail(ticketId: string): void;
  initialWorkspaceOpenTabsState?: WorkspaceOpenTabsState;
  saveWorkspaceOpenTabsStateAction?: SaveWorkspaceOpenTabsStateAction;
  selectedTicketId?: string;
  ticketTabs: WorkspaceTicketTab[];
};

export function useTicketWorkspaceTabsState({
  cacheSelectedDetail,
  detail,
  ensureTicketDetail,
  initialWorkspaceOpenTabsState,
  saveWorkspaceOpenTabsStateAction,
  selectedTicketId,
  ticketTabs,
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

  useEffect(() => {
    if (!saveWorkspaceOpenTabsStateAction) {
      return;
    }

    void saveWorkspaceOpenTabsStateAction({
      activePane: activeTicketId ?? "list",
      openTabs: cappedWorkspaceTabs(openTicketTabs),
      recentTabs: cappedWorkspaceTabs(recentTicketTabs),
      tabOrientation,
      updatedAt: new Date().toISOString(),
      version: workspaceOpenTabsStateVersion,
    }).catch(() => undefined);
  }, [
    activeTicketId,
    openTicketTabs,
    recentTicketTabs,
    saveWorkspaceOpenTabsStateAction,
    tabOrientation,
  ]);

  function updateOpenTicketTabMetadata(patch: TicketMetadataSavedPatch) {
    setOpenTicketTabs((current) => patchTicketTabMetadata(current, patch));
    setRecentTicketTabs((current) => patchTicketTabMetadata(current, patch));
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
        : [...current, tab],
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
    setOpenTicketTabs((current) => {
      const sourceIndex = current.findIndex((tab) => tab.id === sourceTicketId);
      if (sourceIndex === -1) {
        return current;
      }

      const next = current.filter((tab) => tab.id !== sourceTicketId);
      const clampedTargetIndex = Math.max(0, Math.min(targetIndex, next.length));
      next.splice(clampedTargetIndex, 0, current[sourceIndex]);
      return next.every((tab, index) => tab.id === current[index]?.id)
        ? current
        : next;
    });
  }

  return {
    activeTicketId,
    closeTicket,
    listActive,
    openTicketTabs,
    recentTicketTabs,
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

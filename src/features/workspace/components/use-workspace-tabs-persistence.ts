"use client";

import { useEffect, useRef } from "react";
import {
  cappedWorkspaceTabs,
  workspaceOpenTabsStateVersion,
  type SaveWorkspaceOpenTabsStateAction,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";
import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import type { TicketTabOrientation } from "./ticket-tabs-panel";

type Options = {
  activeTicketId?: string;
  initialState?: WorkspaceOpenTabsState;
  openTicketTabs: WorkspaceTicketTab[];
  recentTicketTabs: WorkspaceTicketTab[];
  saveAction?: SaveWorkspaceOpenTabsStateAction;
  selectedTicketId?: string;
  tabOrientation: TicketTabOrientation;
  workspaceId?: string;
};

export function useWorkspaceTabsPersistence({
  activeTicketId,
  initialState,
  openTicketTabs,
  recentTicketTabs,
  saveAction,
  selectedTicketId,
  tabOrientation,
  workspaceId,
}: Options) {
  const timestamp = useRef(Date.parse(initialState?.updatedAt ?? "") || 0);
  const skipInitialSave = useRef(!selectedTicketId);

  useEffect(() => {
    if (!saveAction || !workspaceId) return;
    if (skipInitialSave.current) {
      skipInitialSave.current = false;
      return;
    }
    const nextTimestamp = Math.max(Date.now(), timestamp.current + 1);
    timestamp.current = nextTimestamp;
    void saveAction({
      activePane: activeTicketId ?? "list",
      openTabs: cappedWorkspaceTabs(openTicketTabs),
      recentTabs: cappedWorkspaceTabs(recentTicketTabs),
      tabOrientation,
      updatedAt: new Date(nextTimestamp).toISOString(),
      version: workspaceOpenTabsStateVersion,
    }, workspaceId).catch(() => undefined);
  }, [
    activeTicketId,
    openTicketTabs,
    recentTicketTabs,
    saveAction,
    tabOrientation,
    workspaceId,
  ]);
}

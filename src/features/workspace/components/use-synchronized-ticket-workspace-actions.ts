"use client";

import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";
import { workspaceOpenTabsLimit } from "@/features/workspace/workspace-tab-state";
import type { CommunicationDraftPersistenceScope } from "./ticket-communication-draft-persistence";
import type { useTicketWorkspaceDisplayState } from "./ticket-workspace-state";
import {
  useTicketTaskbarSync,
  type SynchronizeWorkspaceTaskbarAction,
} from "./use-ticket-taskbar-sync";

type DisplayState = ReturnType<typeof useTicketWorkspaceDisplayState>;

type Options = {
  action?: SynchronizeWorkspaceTaskbarAction;
  displayState: DisplayState;
  loadTicketDetailAction: Parameters<typeof useTicketTaskbarSync>[0]["loadTicketDetailAction"];
  onExplicitClose(ticketId: string): void;
  scope?: Omit<CommunicationDraftPersistenceScope, "ticketExternalId">;
  ticketTabs: WorkspaceTicketTab[];
};

function reorderedTicketIds(
  tabs: WorkspaceTicketTab[],
  sourceTicketId: string,
  targetIndex: number,
) {
  const source = tabs.find((tab) => tab.id === sourceTicketId);
  if (!source) return tabs.map((tab) => tab.id);
  const next = tabs.filter((tab) => tab.id !== sourceTicketId);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, source);
  return next.map((tab) => tab.id);
}

function nextActiveTicketAfterClose(
  tabs: WorkspaceTicketTab[],
  ticketId: string,
) {
  const closingIndex = tabs.findIndex((tab) => tab.id === ticketId);
  if (closingIndex < 0) return undefined;
  const remaining = tabs.filter((tab) => tab.id !== ticketId);
  return remaining[closingIndex]?.id ?? remaining[closingIndex - 1]?.id;
}

export function notificationTaskbarOrder(
  tabs: WorkspaceTicketTab[],
  ticketId: string,
) {
  if (tabs.some((tab) => tab.id === ticketId)) return undefined;
  return [
    ticketId,
    ...tabs.map((tab) => tab.id).filter((id) => id !== ticketId),
  ].slice(0, workspaceOpenTabsLimit);
}

export function evictedTaskbarTicketId(
  tabs: WorkspaceTicketTab[],
  openedTicketId: string,
) {
  if (
    tabs.length < workspaceOpenTabsLimit ||
    tabs.some((tab) => tab.id === openedTicketId)
  ) {
    return undefined;
  }
  return tabs[workspaceOpenTabsLimit - 1]?.id;
}

export function useSynchronizedTicketWorkspaceActions({
  action,
  displayState,
  loadTicketDetailAction,
  onExplicitClose,
  scope,
  ticketTabs,
}: Options) {
  const taskbar = useTicketTaskbarSync({
    action,
    activeTicketId: displayState.activeTicketId,
    loadTicketDetailAction,
    openTicketTabs: displayState.openTicketTabs,
    reconcileOpenTicketTabs: displayState.reconcileOpenTicketTabs,
    scope,
    ticketTabs,
  });

  function synchronizeActivation(ticketId: string) {
    void taskbar.activate(ticketId);
  }

  function showTicketFromRow(ticketId: string) {
    const alreadyOpen = displayState.openTicketTabs.some(
      (tab) => tab.id === ticketId,
    );
    const evictedTicketId = evictedTaskbarTicketId(
      displayState.openTicketTabs,
      ticketId,
    );
    displayState.showTicketFromRow(ticketId);
    if (evictedTicketId) void taskbar.close(evictedTicketId);
    if (!alreadyOpen) void taskbar.open(ticketId);
    synchronizeActivation(ticketId);
  }

  function showOpenTicket(ticketId: string) {
    displayState.showOpenTicket(ticketId);
    synchronizeActivation(ticketId);
  }

  function showList() {
    displayState.showList();
    void taskbar.deactivate();
  }

  function showNotificationTicket(tab: WorkspaceTicketTab) {
    const nextOrder = notificationTaskbarOrder(
      displayState.openTicketTabs,
      tab.id,
    );
    const evictedTicketId = evictedTaskbarTicketId(
      displayState.openTicketTabs,
      tab.id,
    );
    displayState.showNotificationTicket(tab);
    if (evictedTicketId) void taskbar.close(evictedTicketId);
    if (nextOrder) void taskbar.open(tab.id);
    synchronizeActivation(tab.id);
    if (nextOrder) void taskbar.reorder(nextOrder);
  }

  function closeTicket(ticketId: string) {
    const wasActive = displayState.activeTicketId === ticketId;
    const nextActiveTicketId = wasActive
      ? nextActiveTicketAfterClose(displayState.openTicketTabs, ticketId)
      : undefined;
    onExplicitClose(ticketId);
    void taskbar.close(ticketId);
    if (!wasActive) return;
    if (nextActiveTicketId) synchronizeActivation(nextActiveTicketId);
    else void taskbar.deactivate();
  }

  function returnActiveTicketToList() {
    const ticketId = displayState.activeTicketId;
    displayState.returnActiveTicketToList();
    if (ticketId) void taskbar.close(ticketId);
    void taskbar.deactivate();
  }

  function reorderOpenTicketTabs(sourceTicketId: string, targetIndex: number) {
    const ticketIds = reorderedTicketIds(
      displayState.openTicketTabs,
      sourceTicketId,
      targetIndex,
    );
    displayState.reorderOpenTicketTabs(sourceTicketId, targetIndex);
    void taskbar.reorder(ticketIds);
  }

  function closeDraftConflict(ticketId: string) {
    const wasActive = displayState.activeTicketId === ticketId;
    const nextActiveTicketId = wasActive
      ? nextActiveTicketAfterClose(displayState.openTicketTabs, ticketId)
      : undefined;
    displayState.closeTicket(ticketId);
    taskbar.dismissDraftConflict(ticketId);
    if (!wasActive) return;
    if (nextActiveTicketId) synchronizeActivation(nextActiveTicketId);
    else void taskbar.deactivate();
  }

  return {
    closeDraftConflict,
    closeTicket,
    displayState: {
      ...displayState,
      returnActiveTicketToList,
      showTicketFromRow,
    },
    draftConflictIds: taskbar.draftConflictIds,
    incompatible: taskbar.incompatible,
    reorderOpenTicketTabs,
    showNotificationTicket,
    showList,
    showOpenTicket,
    selectionUnsynchronized: taskbar.selectionUnsynchronized,
    unsynchronizedIds: taskbar.unsynchronizedIds,
  };
}

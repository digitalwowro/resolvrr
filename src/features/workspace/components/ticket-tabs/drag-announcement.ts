import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";

function tabLabel(tab: WorkspaceTicketTab) {
  return tab.number || tab.title;
}

function reorderedTabs(
  tabs: WorkspaceTicketTab[],
  sourceId: string,
  targetIndex: number,
) {
  const sourceIndex = tabs.findIndex((tab) => tab.id === sourceId);
  if (sourceIndex === -1) {
    return tabs;
  }

  const next = tabs.filter((tab) => tab.id !== sourceId);
  const clampedTargetIndex = Math.max(0, Math.min(targetIndex, next.length));
  next.splice(clampedTargetIndex, 0, tabs[sourceIndex]);
  return next;
}

export function moveAnnouncement(
  tabs: WorkspaceTicketTab[],
  sourceId: string,
  targetIndex: number,
) {
  const sourceIndex = tabs.findIndex((tab) => tab.id === sourceId);
  if (sourceIndex === -1 || sourceIndex === targetIndex) {
    return undefined;
  }

  const nextTabs = reorderedTabs(tabs, sourceId, targetIndex);
  const movedIndex = nextTabs.findIndex((tab) => tab.id === sourceId);
  const movedTab = nextTabs[movedIndex];
  if (!movedTab) {
    return undefined;
  }

  const previousTab = nextTabs[movedIndex - 1];
  const nextTab = nextTabs[movedIndex + 1];
  if (previousTab) {
    return `Moved ${tabLabel(movedTab)} after ${tabLabel(previousTab)}.`;
  }
  if (nextTab) {
    return `Moved ${tabLabel(movedTab)} before ${tabLabel(nextTab)}.`;
  }
  return `Moved ${tabLabel(movedTab)}.`;
}

"use client";

import type { WorkspaceTicketTab } from "@/features/tickets/workspace-adapter";

type TaskbarSyncNoticeProps = {
  conflictIds: string[];
  hiddenUnsynchronizedCount: number;
  incompatible: boolean;
  selectionUnsynchronized: boolean;
  onCloseConflict(ticketId: string): void;
};

export function hiddenTaskbarSyncCount(
  openTabs: WorkspaceTicketTab[],
  unsynchronizedIds: string[],
) {
  const visibleIds = new Set(openTabs.map((tab) => tab.id));
  return unsynchronizedIds.filter((id) => !visibleIds.has(id)).length;
}

export function TaskbarSyncNotice({
  conflictIds,
  hiddenUnsynchronizedCount,
  incompatible,
  selectionUnsynchronized,
  onCloseConflict,
}: TaskbarSyncNoticeProps) {
  if (
    conflictIds.length === 0 &&
    hiddenUnsynchronizedCount === 0 &&
    !incompatible &&
    !selectionUnsynchronized
  ) return null;
  return (
    <div className="fixed left-1/2 top-16 z-[80] flex max-w-xl -translate-x-1/2 flex-col gap-2" role="status">
      {incompatible ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
          Ticket tabs cannot be synchronized with this Zammad version.
        </div>
      ) : null}
      {selectionUnsynchronized && !incompatible ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
          The active List or ticket selection is not synchronized yet. Resolvrr will retry.
        </div>
      ) : null}
      {hiddenUnsynchronizedCount > 0 &&
      !incompatible &&
      !selectionUnsynchronized ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg">
          A ticket-tab change is not synchronized yet. Resolvrr will retry.
        </div>
      ) : null}
      {conflictIds.map((ticketId) => (
        <div className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg" key={ticketId}>
          <span>Zammad closed ticket {ticketId}, but Resolvrr kept it open because it has an unsaved draft.</span>
          <button
            className="shrink-0 rounded-md border border-amber-300 bg-white px-3 py-1.5 font-medium hover:bg-amber-100"
            onClick={() => onCloseConflict(ticketId)}
            type="button"
          >
            Close in Resolvrr
          </button>
        </div>
      ))}
    </div>
  );
}

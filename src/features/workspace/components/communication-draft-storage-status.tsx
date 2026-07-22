"use client";

import type {
  WorkspaceCommunicationDraftEntry,
} from "./workspace-communication-draft-controller";

export function CommunicationDraftStorageStatus({
  entry,
}: {
  entry: WorkspaceCommunicationDraftEntry;
}) {
  if (entry.status !== "local-storage-unavailable") return null;
  return (
    <span
      className="ml-auto shrink-0 text-[11px] text-slate-500"
      title={entry.message}
    >
      Browser storage unavailable
    </span>
  );
}

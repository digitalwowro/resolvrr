"use client";

import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import {
  noTicketCommunicationCapabilities,
  type TicketCommunicationCapabilities,
  type TicketInternalNoteActionState,
  type TicketInternalNotePayload,
} from "@/features/tickets/communication-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import {
  metadataDraftFromDetail,
  metadataDraftKey,
  type TicketMetadataSavedPatch,
} from "./metadata-draft";
import { TicketMetadataEditorState } from "./ticket-metadata-editor-state";

export function TicketMetadataEditor({
  addTicketInternalNoteAction = unavailableInternalNoteAction,
  communicationCapabilities = noTicketCommunicationCapabilities,
  detail,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  updateTicketMetadataAction,
}: {
  addTicketInternalNoteAction?: (
    request: TicketInternalNotePayload,
  ) => Promise<TicketInternalNoteActionState>;
  communicationCapabilities?: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh?(ticketId: string): void;
  onReturnToListAfterUpdate(): void;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
}) {
  const loadedBaseline = metadataDraftFromDetail(detail);

  return (
    <TicketMetadataEditorState
      addTicketInternalNoteAction={addTicketInternalNoteAction}
      communicationCapabilities={communicationCapabilities}
      detail={detail}
      key={metadataDraftKey(loadedBaseline)}
      loadedBaseline={loadedBaseline}
      metadataMutationCapabilities={metadataMutationCapabilities}
      onMetadataSaved={onMetadataSaved}
      onMetadataSavedDetailRefresh={onMetadataSavedDetailRefresh}
      onReturnToListAfterUpdate={onReturnToListAfterUpdate}
      updateTicketMetadataAction={updateTicketMetadataAction}
    />
  );
}

async function unavailableInternalNoteAction(): Promise<TicketInternalNoteActionState> {
  return {
    status: "failed",
    message: "This workspace cannot add internal notes.",
  };
}

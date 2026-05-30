"use client";

import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import {
  metadataDraftFromDetail,
  metadataDraftKey,
  type TicketMetadataSavedPatch,
} from "./metadata-draft";
import { TicketMetadataEditorState } from "./ticket-metadata-editor-state";

export function TicketMetadataEditor({
  detail,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  updateTicketMetadataAction,
}: {
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

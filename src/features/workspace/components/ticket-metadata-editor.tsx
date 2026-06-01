"use client";

import type { ReactNode } from "react";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import {
  noTicketCommunicationCapabilities,
  type TicketCommunicationCapabilities,
  type TicketCustomerReplyActionState,
  type TicketCustomerReplyPayload,
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
  addTicketCustomerReplyAction = unavailableCustomerReplyAction,
  addTicketInternalNoteAction = unavailableInternalNoteAction,
  communicationCapabilities = noTicketCommunicationCapabilities,
  detail,
  header,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  searchTicketLinkTargetsAction = unavailableLinkTargetSearchAction,
  updateTicketMetadataAction,
}: {
  addTicketCustomerReplyAction?: (
    request: TicketCustomerReplyPayload,
  ) => Promise<TicketCustomerReplyActionState>;
  addTicketInternalNoteAction?: (
    request: TicketInternalNotePayload,
  ) => Promise<TicketInternalNoteActionState>;
  communicationCapabilities?: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  header?: ReactNode;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh?(ticketId: string): void;
  onReturnToListAfterUpdate(): void;
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
}) {
  const loadedBaseline = metadataDraftFromDetail(detail);

  return (
    <TicketMetadataEditorState
      addTicketCustomerReplyAction={addTicketCustomerReplyAction}
      addTicketInternalNoteAction={addTicketInternalNoteAction}
      communicationCapabilities={communicationCapabilities}
      detail={detail}
      header={header}
      key={metadataDraftKey(loadedBaseline)}
      loadedBaseline={loadedBaseline}
      metadataMutationCapabilities={metadataMutationCapabilities}
      onMetadataSaved={onMetadataSaved}
      onMetadataSavedDetailRefresh={onMetadataSavedDetailRefresh}
      onReturnToListAfterUpdate={onReturnToListAfterUpdate}
      searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
      updateTicketMetadataAction={updateTicketMetadataAction}
    />
  );
}

async function unavailableCustomerReplyAction(): Promise<TicketCustomerReplyActionState> {
  return {
    status: "failed",
    message: "This workspace cannot send customer replies.",
  };
}

const unavailableLinkTargetSearchAction: SearchWorkspaceTicketLinkTargetsAction =
  async () => ({
    status: "unavailable",
    reason: "unsupported-capability",
    retryable: false,
  });

async function unavailableInternalNoteAction(): Promise<TicketInternalNoteActionState> {
  return {
    status: "failed",
    message: "This workspace cannot add internal notes.",
  };
}

"use client";

import { useMemo, type ReactNode } from "react";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import {
  noTicketCommunicationCapabilities,
  type TicketCommunicationCapabilities,
} from "@/features/tickets/communication-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import {
  metadataDraftFromDetail,
  type TicketMetadataSavedPatch,
} from "./metadata-draft";
import { TicketMetadataEditorState } from "./ticket-metadata-editor-state";

export function TicketMetadataEditor({
  communicationCapabilities = noTicketCommunicationCapabilities,
  detail,
  header,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets = [],
  searchTicketLinkTargetsAction = unavailableLinkTargetSearchAction,
  updateTicketMetadataAction,
}: {
  communicationCapabilities?: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  header?: ReactNode;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh?(ticketId: string): void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets?: WorkspaceTicketLinkTarget[];
  searchTicketLinkTargetsAction?: SearchWorkspaceTicketLinkTargetsAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
}) {
  const loadedBaseline = useMemo(() => metadataDraftFromDetail(detail), [detail]);

  return (
    <TicketMetadataEditorState
      communicationCapabilities={communicationCapabilities}
      detail={detail}
      header={header}
      key={detail.id}
      loadedBaseline={loadedBaseline}
      metadataMutationCapabilities={metadataMutationCapabilities}
      onMetadataSaved={onMetadataSaved}
      onMetadataSavedDetailRefresh={onMetadataSavedDetailRefresh}
      onReturnToListAfterUpdate={onReturnToListAfterUpdate}
      recentlyViewedLinkTargets={recentlyViewedLinkTargets}
      searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
      updateTicketMetadataAction={updateTicketMetadataAction}
    />
  );
}

const unavailableLinkTargetSearchAction: SearchWorkspaceTicketLinkTargetsAction =
  async () => ({
    status: "unavailable",
    reason: "unsupported-capability",
    retryable: false,
  });

"use client";

import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type {
  AiRephraseStyleOption,
  RewriteDraftAction,
  SummarizeWorkspaceTicketAction,
  TicketAiSummaryResult,
} from "@/features/ai";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type { TicketMetadataSavedPatch } from "./metadata-draft";
import { TicketMetadataEditor } from "./ticket-metadata-editor";
import { TicketDetailHeader } from "./ticket-detail-header";
export { TicketDetailLoadingShell } from "./ticket-detail-loading-shell";

type TicketDetailProps = {
  communicationCapabilities: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh(ticketId: string): void;
  onRefresh(): void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  rephraseStyleOptions?: AiRephraseStyleOption[];
  refreshing?: boolean;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  rewriteDraftAction?: RewriteDraftAction;
  summarizeTicketAction: SummarizeWorkspaceTicketAction;
  initialTicketAiSummary?: {
    result: Extract<TicketAiSummaryResult, { status: "available" }>;
    ticketId: string;
  };
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userId?: string;
  workspaceId?: string;
};

export function TicketDetail({
  communicationCapabilities,
  detail,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets,
  rephraseStyleOptions,
  refreshing = false,
  searchTicketLinkTargetsAction,
  rewriteDraftAction,
  summarizeTicketAction,
  initialTicketAiSummary,
  updateTicketMetadataAction,
  userId,
  workspaceId,
}: TicketDetailProps) {
  return (
    <TicketMetadataEditor
      communicationCapabilities={communicationCapabilities}
      detail={detail}
      header={
        <TicketDetailHeader
          detail={detail}
          initialTicketAiSummary={initialTicketAiSummary}
          onRefresh={onRefresh}
          refreshing={refreshing}
          summarizeTicketAction={summarizeTicketAction}
        />
      }
      metadataMutationCapabilities={
        metadataMutationCapabilities ?? { state: false, priority: false }
      }
      onMetadataSaved={onMetadataSaved}
      onMetadataSavedDetailRefresh={onMetadataSavedDetailRefresh}
      onReturnToListAfterUpdate={onReturnToListAfterUpdate}
      recentlyViewedLinkTargets={recentlyViewedLinkTargets}
      rephraseStyleOptions={rephraseStyleOptions}
      searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
      rewriteDraftAction={rewriteDraftAction}
      updateTicketMetadataAction={updateTicketMetadataAction}
      userId={userId}
      workspaceId={workspaceId}
    />
  );
}

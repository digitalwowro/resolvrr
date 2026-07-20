"use client";

import type { WorkspaceTicketDetailLoadResult } from "@/features/tickets/detail-action-result";
import type { WorkspaceTicketLinkTarget } from "@/features/tickets/link-target-search-action-result";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import type {
  AiRephraseStyleOption,
  RewriteDraftAction,
  SummarizeWorkspaceTicketAction,
} from "@/features/ai";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { TicketAiSummaryResult } from "@/features/ai";
import type { InitialTicketAiSummary } from "@/features/workspace/ticket-detail-hydration";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type {
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "@/features/tickets/workspace-adapter";
import { TicketDetail, TicketDetailLoadingShell } from "./ticket-detail";
import {
  DetailLoadingState,
  DetailRetiredState,
  DetailUnavailableState,
  EmptyDetailState,
} from "./workspace-states";

type TicketDetailLoadState =
  | WorkspaceTicketDetailLoadResult
  | { status: "loading" };

type TicketDetailLoadingSummary = WorkspaceTicketTab &
  Partial<Pick<WorkspaceTicketRow, "createdAt" | "providerUrl" | "updatedAt">>;

export type TicketWorkspaceDetailAreaProps = {
  activeDetail?: TicketDetailLoadState;
  activeTicketId?: string;
  activeTicketSummary?: TicketDetailLoadingSummary;
  communicationCapabilities: TicketCommunicationCapabilities;
  metadataMutationCapabilities?: TicketMetadataMutationCapabilities;
  onMetadataSaved: Parameters<typeof TicketDetail>[0]["onMetadataSaved"];
  onMetadataSavedDetailRefresh(ticketId: string): void;
  onTicketAiSummaryAvailable(
    ticketId: string,
    summary: InitialTicketAiSummary,
  ): void;
  onRefresh(): void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  rephraseStyleOptions?: AiRephraseStyleOption[];
  refreshing: boolean;
  roundedTop: boolean;
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
  helpdeskConnectionId?: string;
  identityVersion?: string;
};

export function TicketWorkspaceDetailArea({
  activeDetail,
  activeTicketId,
  activeTicketSummary,
  communicationCapabilities,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onTicketAiSummaryAvailable,
  onRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets,
  rephraseStyleOptions,
  refreshing,
  roundedTop,
  searchTicketLinkTargetsAction,
  rewriteDraftAction,
  summarizeTicketAction,
  initialTicketAiSummary,
  updateTicketMetadataAction,
  userId,
  workspaceId,
  helpdeskConnectionId,
  identityVersion,
}: TicketWorkspaceDetailAreaProps) {
  if (activeDetail?.status === "retired") {
    return <DetailRetiredState key="work-area" />;
  }

  if (activeDetail?.status === "unavailable") {
    return <DetailUnavailableState key="work-area" reason={activeDetail.reason} />;
  }

  if (activeDetail?.status === "available") {
    return (
      <TicketDetail
        key={`work-area-${activeDetail.detail.id}`}
        detail={activeDetail.detail}
        communicationCapabilities={communicationCapabilities}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onMetadataSaved={onMetadataSaved}
        onMetadataSavedDetailRefresh={onMetadataSavedDetailRefresh}
        onTicketAiSummaryAvailable={onTicketAiSummaryAvailable}
        onRefresh={onRefresh}
        onReturnToListAfterUpdate={onReturnToListAfterUpdate}
        recentlyViewedLinkTargets={recentlyViewedLinkTargets}
        rephraseStyleOptions={rephraseStyleOptions}
        searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
        rewriteDraftAction={rewriteDraftAction}
        summarizeTicketAction={summarizeTicketAction}
        initialTicketAiSummary={initialTicketAiSummary}
        refreshing={refreshing}
        updateTicketMetadataAction={updateTicketMetadataAction}
        userId={userId}
        workspaceId={workspaceId}
        helpdeskConnectionId={helpdeskConnectionId}
        identityVersion={identityVersion}
      />
    );
  }

  if (!activeTicketId) {
    return <EmptyDetailState key="work-area" />;
  }

  return activeTicketSummary ? (
    <TicketDetailLoadingShell
      key="work-area"
      roundedTop={roundedTop}
      ticket={activeTicketSummary}
    />
  ) : (
    <DetailLoadingState key="work-area" />
  );
}

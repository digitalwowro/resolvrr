import type { ReactNode } from "react";
import type { AiRephraseStyleOption, RewriteDraftAction } from "@/features/ai";
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
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type {
  SelectedTicketDraft,
  TicketMetadataSavedPatch,
} from "./metadata-draft";

export type TicketMetadataEditorStateProps = {
  communicationCapabilities: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  header?: ReactNode;
  loadedBaseline: SelectedTicketDraft;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh?: (ticketId: string) => void;
  onReturnToListAfterUpdate(): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  rephraseStyleOptions?: AiRephraseStyleOption[];
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  rewriteDraftAction?: RewriteDraftAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
  userId?: string;
  workspaceId?: string;
};

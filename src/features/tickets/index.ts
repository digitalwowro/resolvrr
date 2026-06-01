export type {
  Ticket,
  TicketArticle,
  TicketCustomerReplyInput,
  TicketDetail,
  TicketInternalNoteInput,
  TicketLinkRelationKind,
  TicketLinkTarget,
  TicketLinkTargetSearchInput,
  TicketListItem,
  TicketMetadataMutationInput,
  TicketPriority,
  TicketState,
  TicketThread,
} from "@/core/tickets";
export {
  formatWorkspaceDateTime,
} from "./date-time-format";
export {
  loadWorkspaceTicketDetail,
  loadWorkspaceTicketList,
  updateWorkspaceTicketMetadata,
} from "./service";
export {
  searchWorkspaceTicketLinkTargets,
} from "./link-target-service";
export {
  addWorkspaceTicketCustomerReply,
  addWorkspaceTicketInternalNote,
} from "./communication-service";
export {
  noTicketCommunicationCapabilities,
  ticketCommunicationCapabilities,
  type TicketCustomerReplyActionState,
  type TicketCustomerReplyPayload,
  type TicketCustomerReplyResult,
  type TicketCommunicationCapabilities,
  type TicketCommunicationErrorReason,
  type TicketInternalNoteActionState,
  type TicketInternalNotePayload,
  type TicketInternalNoteResult,
} from "./communication-model";
export {
  type LoadWorkspaceTicketDetailAction,
  type WorkspaceTicketDetailLoadResult,
} from "./detail-action-result";
export {
  type LoadWorkspaceTicketListPageAction,
  type WorkspaceTicketListPageLoadResult,
} from "./list-page-action-result";
export {
  type SearchWorkspaceTicketLinkTargetsAction,
  type WorkspaceTicketLinkTarget,
  type WorkspaceTicketLinkTargetSearchRequest,
  type WorkspaceTicketLinkTargetSearchResult,
} from "./link-target-search-action-result";
export {
  noTicketMetadataMutationCapabilities,
  ticketMetadataMutationCapabilities,
  type SelectedTicketUpdateMetadataPayload,
  type SelectedTicketUpdatePayload,
  type TicketMetadataMutationActionState,
  type TicketMetadataMutationCapabilities,
  type TicketMetadataMutationErrorReason,
  type TicketMetadataMutationField,
  type TicketMetadataMutationResult,
} from "./mutation-model";
export {
  selectedTicketExternalId,
  type TicketDetailReadResult,
  type TicketListReadResult,
  type TicketReadUnavailable,
  type TicketReadUnavailableReason,
} from "./read-model";
export {
  defaultWorkspaceTicketColumns,
  workspaceTicketDetail,
  workspaceTicketRows,
  workspaceTicketTabs,
  type WorkspaceArticle,
  type WorkspaceArticleContact,
  type WorkspaceTicketColumn,
  type WorkspaceTicketColumnKey,
  type WorkspaceTicketGroupKey,
  type WorkspaceTicketDetail,
  type WorkspaceTicketRow,
  type WorkspaceTicketSortKey,
  type WorkspaceTicketTab,
} from "./workspace-adapter";
export {
  ticketListQueryCapabilities,
} from "./list-query-guardrails";

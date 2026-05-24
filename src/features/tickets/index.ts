export type {
  Ticket,
  TicketArticle,
  TicketDetail,
  TicketListItem,
  TicketPriority,
  TicketState,
  TicketThread,
} from "@/core/tickets";
export {
  loadWorkspaceTicketDetail,
  loadWorkspaceTicketList,
} from "./service";
export {
  selectedTicketExternalId,
  type TicketDetailReadResult,
  type TicketListReadResult,
  type TicketReadUnavailable,
  type TicketReadUnavailableReason,
} from "./read-model";
export {
  workspaceTicketDetail,
  workspaceTicketRows,
  type WorkspaceArticle,
  type WorkspaceTicketDetail,
  type WorkspaceTicketRow,
} from "./workspace-adapter";

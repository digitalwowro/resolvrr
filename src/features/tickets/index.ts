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
  formatWorkspaceDateTime,
} from "./date-time-format";
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

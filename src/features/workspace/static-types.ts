export type StaticWorkspaceVariant =
  | "ready"
  | "loading"
  | "empty"
  | "error"
  | "disconnected";

export type StaticTabOrientation = "horizontal" | "vertical";

export type StaticTicketState = "open" | "pending" | "escalated" | "resolved";

export type StaticTicketPriority = "low" | "normal" | "high" | "urgent";

export type StaticColumnKey =
  | "requester"
  | "workspace"
  | "state"
  | "priority"
  | "assignee"
  | "updated"
  | "sla";

export type StaticSortKey = "ticket" | "updated" | "priority" | "sla";

export type StaticSavedView = {
  id: string;
  label: string;
};

export type StaticProfileWorkspace = {
  id: string;
  label: string;
};

export type StaticProfileAction = {
  id: string;
  label: string;
};

export type StaticTicketTab = {
  id: string;
  label: string;
  unread?: boolean;
  dirty?: boolean;
  loading?: boolean;
};

export type StaticTicketRow = {
  id: string;
  ticketNumber: string;
  subject: string;
  requester: string;
  workspace: string;
  state: StaticTicketState;
  priority: StaticTicketPriority;
  assignee: string;
  updated: string;
  sla: string;
  preview: string;
};

export type StaticColumn = {
  key: StaticColumnKey;
  label: string;
};

export type StaticStateVariant = {
  id: StaticWorkspaceVariant;
  label: string;
  title: string;
  detail: string;
};

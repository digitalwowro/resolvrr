export type StaticTabOrientation = "horizontal" | "vertical";

export type StaticTicketState =
  | "New"
  | "Open"
  | "Pending Reminder"
  | "Pending Close"
  | "Closed";

export type StaticTicketPriority = "Low" | "Medium" | "High";

export type StaticColumnKey =
  | "customer"
  | "owner"
  | "state"
  | "priority"
  | "pendingTill"
  | "updatedAt";

export type StaticSortKey =
  | "number"
  | "title"
  | "customer"
  | "owner"
  | "state"
  | "priority"
  | "pendingTill"
  | "updatedAt";

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
  title: string;
  customer: string;
  owner: string;
  priority: StaticTicketPriority;
  state: StaticTicketState;
  unread?: boolean;
  dirty?: boolean;
  loading?: boolean;
};

export type StaticTicketRow = {
  id: string;
  number: string;
  title: string;
  customer: string;
  owner: string;
  state: StaticTicketState;
  priority: StaticTicketPriority;
  pendingTill: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
};

export type StaticTicketReplyType = "customer" | "employee" | "internal-note";

export type StaticTicketReplyContact = {
  name: string;
  email: string;
};

export type StaticTicketReply = {
  id: string;
  ticketId: string;
  type: StaticTicketReplyType;
  authorName: string;
  authorEmail: string;
  recipients: StaticTicketReplyContact[];
  createdAt: string;
  body: string;
};

export type StaticColumn = {
  key: StaticColumnKey;
  label: string;
};

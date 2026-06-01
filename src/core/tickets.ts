import type { TicketLookupData } from "./ticket-lookups";

export const ticketStates = [
  "new",
  "open",
  "pending_reminder",
  "pending_close",
  "closed",
] as const;

export type TicketState = (typeof ticketStates)[number];

export type TicketStateCategory = "open" | "waiting" | "closed";

export type TicketStateDefinition = {
  key: TicketState;
  label: string;
  category: TicketStateCategory;
  terminal: boolean;
};

export const ticketStateDefinitions: Record<TicketState, TicketStateDefinition> = {
  new: { key: "new", label: "New", category: "open", terminal: false },
  open: { key: "open", label: "Open", category: "open", terminal: false },
  pending_reminder: {
    key: "pending_reminder",
    label: "Pending Reminder",
    category: "waiting",
    terminal: false,
  },
  pending_close: {
    key: "pending_close",
    label: "Pending Close",
    category: "waiting",
    terminal: false,
  },
  closed: { key: "closed", label: "Closed", category: "closed", terminal: true },
};

export const ticketPriorities = ["low", "medium", "high"] as const;

export type TicketPriority = (typeof ticketPriorities)[number];

export type TicketPriorityDefinition = {
  key: TicketPriority;
  label: string;
  rank: number;
};

export const ticketPriorityDefinitions: Record<
  TicketPriority,
  TicketPriorityDefinition
> = {
  low: { key: "low", label: "Low", rank: 10 },
  medium: { key: "medium", label: "Medium", rank: 20 },
  high: { key: "high", label: "High", rank: 30 },
};

export type TicketExternalId = string;
export type TicketArticleExternalId = string;

export type TicketParticipantRole = "agent" | "customer" | "system" | "unknown";

export type TicketParticipant = {
  externalId?: string;
  name?: string;
  email?: string;
  role?: TicketParticipantRole;
};

export type TicketGroupReference = {
  externalId?: string;
  name: string;
};

export type TicketLink = {
  externalId: string;
  direction: "parent" | "child" | "related";
  label: string;
  providerUrl?: string;
};

export const ticketLinkRelationKinds = ["related", "parent", "child"] as const;

export type TicketLinkRelationKind = (typeof ticketLinkRelationKinds)[number];

export type TicketLinkTargetSearchInput = {
  customerExternalId?: string;
  excludeTicketExternalId?: TicketExternalId;
  limit?: number;
  query?: string;
};

export type TicketLinkTarget = {
  customer?: string;
  externalId: TicketExternalId;
  number: string;
  priority?: TicketPriority;
  state?: TicketState;
  title: string;
};

export type TicketSubscription = {
  externalId?: string;
  supported: boolean;
  following: boolean;
};

export type TicketAttachment = {
  externalId: string;
  fileName: string;
  contentType?: string;
  byteSize?: number;
};

export type TicketArticleVisibility = "public" | "internal";

export type TicketArticleDirection =
  | "inbound"
  | "outbound"
  | "internal"
  | "system"
  | "unknown";

export type TicketArticleKind =
  | "message"
  | "note"
  | "system_event"
  | "unknown";

export type TicketArticleRecipient = TicketParticipant & {
  channel: "to" | "cc" | "bcc";
};

export type TicketArticle = {
  externalId: TicketArticleExternalId;
  kind: TicketArticleKind;
  visibility: TicketArticleVisibility;
  direction: TicketArticleDirection;
  author: TicketParticipant;
  recipients: TicketArticleRecipient[];
  createdAt: Date;
  subject?: string;
  sanitizedHtml: string;
  textPreview?: string;
  attachments: TicketAttachment[];
};

export type TicketCommunicationBodyFormat = "plain" | "html";

export type TicketThread = {
  ticketExternalId: TicketExternalId;
  articles: TicketArticle[];
};

export type Ticket = {
  externalId: TicketExternalId;
  number: string;
  title: string;
  customer?: TicketParticipant;
  owner?: TicketParticipant;
  group?: TicketGroupReference;
  state?: TicketState;
  priority?: TicketPriority;
  createdAt?: Date;
  updatedAt: Date;
  pendingUntil?: Date;
  tags: string[];
  providerUrl?: string;
  metadataMutationConstraints?: TicketMetadataMutationConstraints;
};

export type TicketListItem = Ticket & {
  textPreview?: string;
};

export type TicketDetail = {
  ticket: Ticket;
  thread: TicketThread;
  links: TicketLink[];
  lookupData?: TicketLookupData;
  subscription: TicketSubscription;
  measuredAt: Date;
};

export type TicketMetadataMutationInput = {
  groupExternalId?: string;
  linkAddExternalId?: string;
  linkAddRelation?: TicketLinkRelationKind;
  linkRemoveExternalIds?: string[];
  ownerExternalId?: string;
  subscriptionFollowing?: boolean;
  state?: TicketState;
  tags?: string[];
  priority?: TicketPriority;
  pendingUntil?: Date;
};

export type TicketInternalNoteInput = {
  body: string;
  bodyFormat?: TicketCommunicationBodyFormat;
};

export type TicketCustomerReplyInput = {
  body: string;
  bodyFormat?: TicketCommunicationBodyFormat;
};

export type TicketMetadataMutationConstraints = {
  hiddenStates?: TicketState[];
  pendingDateRequiredStates?: Partial<Record<TicketState, string>>;
};

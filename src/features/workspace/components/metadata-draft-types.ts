import type {
  TicketLinkRelationKind,
  TicketPriority,
  TicketState,
} from "@/core/tickets";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { PendingDateTimeParts } from "./ticket-pending-date-time";

export type TicketMetadataDraft = {
  groupExternalId?: string;
  linkAddExternalId?: string;
  linkAddRelation: TicketLinkRelationKind;
  linkRemoveExternalIds: string[];
  ownerExternalId?: string;
  pendingDateTime: PendingDateTimeParts;
  priority?: TicketPriority;
  state?: TicketState;
  subscriptionFollowing?: boolean;
  tagText: string;
  tags: string[];
};

export type TicketInternalCommentDraft = {
  body: string;
  kind: "internal-comment";
};

export type TicketCustomerReplyDraft = {
  body: string;
  cc: string[];
  contextVersion: string;
  defaultCc: string[];
  defaultTo: string[];
  intent: TicketReplyIntent;
  kind: "customer-reply";
  sourceArticleExternalId: string;
  to: string[];
};

export type TicketCommunicationDraft =
  | TicketInternalCommentDraft
  | TicketCustomerReplyDraft;

export const selectedTicketDraftEditableSlices = [
  "metadata",
  "communication",
] as const;

export type SelectedTicketDraftEditableSlice =
  (typeof selectedTicketDraftEditableSlices)[number];

export type SelectedTicketDraft = {
  communication?: TicketCommunicationDraft;
  metadata: TicketMetadataDraft;
  ticketExternalId: string;
};

export type TicketMetadataDraftDirtyFields = {
  communication: boolean;
  pendingDate: boolean;
  pendingTime: boolean;
  pendingUntil: boolean;
  group: boolean;
  links: boolean;
  owner: boolean;
  priority: boolean;
  state: boolean;
  subscription: boolean;
  tags: boolean;
};

export type TicketMetadataDraftValidation = {
  message?: string;
  valid: boolean;
};

export type TicketMetadataSavedPatch = {
  group?: string;
  owner?: string;
  priority?: TicketPriority;
  state?: TicketState;
  subscriptionFollowing?: boolean;
  tags?: string[];
  ticketExternalId: string;
};

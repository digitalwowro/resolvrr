import type {
  TicketLinkRelationKind,
  TicketPriority,
  TicketMutableState,
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
  state?: TicketMutableState;
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

export type TicketCustomerForwardDraft = {
  attachmentExternalIds: string[];
  body: string;
  cc: string[];
  contextVersion: string;
  defaultAttachmentExternalIds: string[];
  defaultCc: string[];
  defaultIncludeOriginal: boolean;
  defaultSubject: string;
  defaultTo: string[];
  includeOriginal: boolean;
  kind: "customer-forward";
  sourceArticleExternalId: string;
  subject: string;
  to: string[];
};

export type TicketCommunicationDraft =
  | TicketInternalCommentDraft
  | TicketCustomerReplyDraft
  | TicketCustomerForwardDraft;

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
  state?: TicketMutableState;
  subscriptionFollowing?: boolean;
  tags?: string[];
  ticketExternalId: string;
};

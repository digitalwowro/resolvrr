import type {
  TicketArticle,
  TicketDetail,
  TicketLink,
  TicketMetadataMutationConstraints,
  TicketPriority,
  TicketSubscription,
  TicketSelectableState,
} from "@/core/tickets";
import type {
  TicketArticleReplyContext,
  TicketReplyPolicy,
} from "@/core/ticket-replies";
import type { TicketArticleForwardContext } from "@/core/ticket-forwards";

export type WorkspaceTicketColumnKey =
  | "customer"
  | "owner"
  | "state"
  | "priority"
  | "pendingTill"
  | "updatedAt";

export type WorkspaceTicketGroupKey =
  | "none"
  | "priority"
  | "state"
  | "owner"
  | "customer"
  | "group";

export type WorkspaceTicketSortKey = "number" | "title" | WorkspaceTicketColumnKey;

export type WorkspaceTicketColumn = {
  key: WorkspaceTicketColumnKey;
  label: string;
};

export type WorkspaceTicketRow = {
  id: string;
  number: string;
  title: string;
  customer: string;
  customerExternalId?: string;
  customerOrganization?: string;
  owner: string;
  ownerExternalId?: string;
  group: string;
  groupExternalId?: string;
  state: string;
  stateKey?: TicketSelectableState;
  priority: string;
  priorityKey?: TicketPriority;
  createdAt?: string;
  pendingTill: string;
  pendingUntilIso?: string;
  updatedAt: string;
  preview?: string;
  providerUrl?: string;
};

export type WorkspaceTicketTab = {
  id: string;
  number: string;
  title: string;
  customer: string;
  customerExternalId?: string;
  customerOrganization?: string;
  owner: string;
  group: string;
  state: string;
  stateKey?: TicketSelectableState;
  priority: string;
  priorityKey?: TicketPriority;
};

export type WorkspaceArticleContact = {
  label: string;
  email?: string;
};

export type WorkspaceAttachment = {
  id: string;
  fileName: string;
  contentType?: string;
  byteSize?: number;
};

export type WorkspaceArticle = {
  id: string;
  author: string;
  authorEmail?: string;
  from: WorkspaceArticleContact;
  to: WorkspaceArticleContact[];
  cc: WorkspaceArticleContact[];
  bcc: WorkspaceArticleContact[];
  direction: TicketArticle["direction"];
  kind?: TicketArticle["kind"];
  meta: string;
  sanitizedHtml: string;
  signatureHints?: TicketArticle["signatureHints"];
  visibility: string;
  attachments: WorkspaceAttachment[];
  forwardContext?: TicketArticleForwardContext;
  replyContext?: TicketArticleReplyContext;
};

export type WorkspaceTicketLink = {
  id: string;
  direction: TicketLink["direction"];
  label: string;
  providerUrl?: string;
};

export type WorkspaceTicketDetail = {
  id: string;
  number: string;
  title: string;
  customer: string;
  customerExternalId?: string;
  customerOrganization?: string;
  owner: string;
  ownerExternalId?: string;
  group: string;
  groupExternalId?: string;
  state: string;
  stateKey?: TicketSelectableState;
  priority: string;
  priorityKey?: TicketPriority;
  createdAt?: string;
  pendingTill: string;
  pendingUntilIso?: string;
  updatedAt: string;
  providerUrl?: string;
  links: WorkspaceTicketLink[];
  lookupData: NonNullable<TicketDetail["lookupData"]>;
  subscription: TicketSubscription;
  tags: string[];
  metadataMutationConstraints?: TicketMetadataMutationConstraints;
  replyPolicy?: TicketReplyPolicy;
  articles: WorkspaceArticle[];
};

export const defaultWorkspaceTicketColumns: WorkspaceTicketColumn[] = [
  { key: "customer", label: "Customer" },
  { key: "owner", label: "Owner" },
  { key: "state", label: "State" },
  { key: "priority", label: "Priority" },
  { key: "pendingTill", label: "Pending" },
  { key: "updatedAt", label: "Updated" },
];

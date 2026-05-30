import type { TicketListBucket } from "@/core/providers";
import { unsupportedTicketLookupData } from "@/core/ticket-lookups";
import {
  ticketPriorityDefinitions,
  ticketStateDefinitions,
  type TicketArticle,
  type TicketAttachment,
  type TicketDetail,
  type TicketLink,
  type TicketListItem,
  type TicketMetadataMutationConstraints,
  type TicketPriority,
  type TicketSubscription,
  type TicketState,
} from "@/core/tickets";
import { formatWorkspaceDateTime } from "./date-time-format";

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
  owner: string;
  ownerExternalId?: string;
  group: string;
  groupExternalId?: string;
  state: string;
  stateKey?: TicketState;
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
  owner: string;
  group: string;
  state: string;
  stateKey?: TicketState;
  priority: string;
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
  meta: string;
  sanitizedHtml: string;
  visibility: string;
  attachments: WorkspaceAttachment[];
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
  owner: string;
  ownerExternalId?: string;
  group: string;
  groupExternalId?: string;
  state: string;
  stateKey?: TicketState;
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
  articles: WorkspaceArticle[];
};

export const defaultWorkspaceTicketColumns: WorkspaceTicketColumn[] = [
  { key: "customer", label: "Customer" },
  { key: "owner", label: "Owner" },
  { key: "state", label: "State" },
  { key: "priority", label: "Priority" },
  { key: "pendingTill", label: "Pending till" },
  { key: "updatedAt", label: "Updated at" },
];

function labelDate(date: Date | undefined): string {
  return date ? formatWorkspaceDateTime(date) : "Unknown";
}

function participantName(value: { name?: string; email?: string } | undefined) {
  return value?.name ?? value?.email ?? "Unassigned";
}

function participantContact(
  value: { name?: string; email?: string } | undefined,
  fallback = "Unknown",
): WorkspaceArticleContact {
  return {
    label: value?.name ?? value?.email ?? fallback,
    email: value?.email,
  };
}

function groupName(value: { name?: string } | undefined) {
  return value?.name ?? "Unassigned";
}

function displayTicketNumber(number: string) {
  return number.startsWith("#") ? number : `#${number}`;
}

function stateLabel(ticket: TicketListItem | TicketDetail["ticket"]): string {
  return ticket.state
    ? ticketStateDefinitions[ticket.state].label
    : "Unknown";
}

function priorityLabel(ticket: TicketListItem | TicketDetail["ticket"]): string {
  return ticket.priority
    ? ticketPriorityDefinitions[ticket.priority].label
    : "Unknown";
}

function articleMeta(article: TicketArticle): string {
  return labelDate(article.createdAt);
}

function articleRecipients(
  article: TicketArticle,
  channel: "to" | "cc" | "bcc",
): WorkspaceArticleContact[] {
  return article.recipients
    .filter((recipient) => recipient.channel === channel)
    .map((recipient) => participantContact(recipient));
}

function workspaceTicketLink(link: TicketLink): WorkspaceTicketLink {
  return {
    id: link.externalId,
    direction: link.direction,
    label: link.label,
    providerUrl: link.providerUrl,
  };
}

function workspaceAttachment(attachment: TicketAttachment): WorkspaceAttachment {
  return {
    id: attachment.externalId,
    fileName: attachment.fileName,
    contentType: attachment.contentType,
    byteSize: attachment.byteSize,
  };
}

export function workspaceTicketRow(ticket: TicketListItem): WorkspaceTicketRow {
  return {
    id: ticket.externalId,
    number: displayTicketNumber(ticket.number),
    title: ticket.title,
    customer: participantName(ticket.customer),
    owner: participantName(ticket.owner),
    ownerExternalId: ticket.owner?.externalId,
    group: groupName(ticket.group),
    groupExternalId: ticket.group?.externalId,
    state: stateLabel(ticket),
    stateKey: ticket.state,
    priority: priorityLabel(ticket),
    priorityKey: ticket.priority,
    createdAt: labelDate(ticket.createdAt),
    pendingTill: ticket.pendingUntil ? labelDate(ticket.pendingUntil) : "-",
    pendingUntilIso: ticket.pendingUntil?.toISOString(),
    updatedAt: labelDate(ticket.updatedAt),
    preview: ticket.textPreview,
    providerUrl: ticket.providerUrl,
  };
}

export function workspaceTicketRows(tickets: TicketListItem[]): WorkspaceTicketRow[] {
  return tickets.map(workspaceTicketRow);
}

export function workspaceTicketListGroups(buckets: TicketListBucket[] = []) {
  return buckets
    .filter(
      (
        bucket,
      ): bucket is TicketListBucket & { key: "state" | "priority" } =>
        bucket.key === "state" || bucket.key === "priority",
    )
    .map((bucket) => ({
      id: `${bucket.key}-${bucket.value}`,
      key: bucket.key,
      value: bucket.value,
      label: bucket.label,
      rows: workspaceTicketRows(bucket.tickets),
      loadedCount: bucket.loadedCount,
      totalCount: bucket.totalCount,
      nextCursor: bucket.nextCursor,
    }));
}

export function workspaceTicketTabs(tickets: WorkspaceTicketRow[]): WorkspaceTicketTab[] {
  return tickets.map((ticket) => ({
    id: ticket.id,
    number: ticket.number,
    title: ticket.title,
    customer: ticket.customer,
    owner: ticket.owner,
    group: ticket.group,
    state: ticket.state,
    stateKey: ticket.stateKey,
    priority: ticket.priority,
  }));
}

export function workspaceTicketDetail(
  detail: TicketDetail,
): WorkspaceTicketDetail {
  return {
    ...workspaceTicketRow(detail.ticket),
    links: detail.links.map(workspaceTicketLink),
    lookupData: detail.lookupData ?? unsupportedTicketLookupData(),
    subscription: detail.subscription,
    tags: detail.ticket.tags,
    metadataMutationConstraints: detail.ticket.metadataMutationConstraints,
    articles: detail.thread.articles.map((article) => ({
      id: article.externalId,
      author: participantName(article.author),
      authorEmail: article.author.email,
      from: participantContact(article.author),
      to: articleRecipients(article, "to"),
      cc: articleRecipients(article, "cc"),
      bcc: articleRecipients(article, "bcc"),
      direction: article.direction,
      meta: articleMeta(article),
      sanitizedHtml: article.sanitizedHtml,
      visibility: article.visibility,
      attachments: article.attachments.map(workspaceAttachment),
    })),
  };
}

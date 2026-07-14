import type { TicketListBucket } from "@/core/providers";
import { unsupportedTicketLookupData } from "@/core/ticket-lookups";
import {
  isTicketSelectableState,
  ticketPriorityDefinitions,
  ticketStateDefinitions,
  type TicketArticle,
  type TicketAttachment,
  type TicketDetail,
  type TicketLink,
  type TicketListItem,
} from "@/core/tickets";
import { formatWorkspaceRelativeTime } from "./date-time-format";
import type {
  WorkspaceArticleContact,
  WorkspaceAttachment,
  WorkspaceTicketDetail,
  WorkspaceTicketLink,
  WorkspaceTicketRow,
  WorkspaceTicketTab,
} from "./workspace-adapter-types";

export * from "./workspace-adapter-types";

function labelDate(date: Date | undefined): string {
  return date ? formatWorkspaceRelativeTime(date) : "Unknown";
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
  return isTicketSelectableState(ticket.state)
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

function newestArticlesFirst(articles: TicketArticle[]): TicketArticle[] {
  return [...articles].sort(
    (first, second) => second.createdAt.getTime() - first.createdAt.getTime(),
  );
}

export function workspaceTicketRow(ticket: TicketListItem): WorkspaceTicketRow {
  return {
    id: ticket.externalId,
    number: displayTicketNumber(ticket.number),
    title: ticket.title,
    customer: participantName(ticket.customer),
    customerExternalId: ticket.customer?.externalId,
    customerOrganization: ticket.customer?.organization,
    owner: participantName(ticket.owner),
    ownerExternalId: ticket.owner?.externalId,
    group: groupName(ticket.group),
    groupExternalId: ticket.group?.externalId,
    state: stateLabel(ticket),
    stateKey: isTicketSelectableState(ticket.state) ? ticket.state : undefined,
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
  return tickets
    .filter((ticket) => ticket.state !== "merged")
    .map(workspaceTicketRow);
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
    customerExternalId: ticket.customerExternalId,
    customerOrganization: ticket.customerOrganization,
    owner: ticket.owner,
    group: ticket.group,
    state: ticket.state,
    stateKey: ticket.stateKey,
    priority: ticket.priority,
    priorityKey: ticket.priorityKey,
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
    replyPolicy: detail.replyPolicy,
    articles: newestArticlesFirst(detail.thread.articles).map((article) => ({
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
      forwardContext: article.forwardContext,
      replyContext: article.replyContext,
    })),
  };
}

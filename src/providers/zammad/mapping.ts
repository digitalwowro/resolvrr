import type {
  Ticket,
  TicketArticle,
  TicketArticleDirection,
  TicketArticleKind,
  TicketArticleRecipient,
  TicketAttachment,
  TicketListItem,
  TicketParticipantRole,
  TicketPriority,
  TicketState,
} from "@/core/tickets";
import { sanitizeProviderHtml } from "@/security/sanitize-html";
import {
  articleAuthor,
  namedAssetValue,
  namedReferenceValue,
  participantFromReference,
  recipientParticipant,
  relationId,
} from "./participants";
import { zammadMetadataMutationConstraints } from "./mutation-policy";
import type { ZammadArticle, ZammadAssets, ZammadTicket } from "./schemas";

const stateMap = new Map<string, TicketState>([
  ["new", "new"],
  ["open", "open"],
  ["pending reminder", "pending_reminder"],
  ["pending close", "pending_close"],
  ["closed", "closed"],
  ["merged", "merged"],
]);

const priorityMap = new Map<string, TicketPriority>([
  ["1 low", "low"],
  ["2 normal", "medium"],
  ["3 high", "high"],
]);

export function mapState(rawState: string | undefined): TicketState | undefined {
  if (!rawState) {
    return undefined;
  }

  return stateMap.get(rawState.toLowerCase());
}

export function mapPriority(
  rawPriority: string | undefined,
): TicketPriority | undefined {
  if (!rawPriority) {
    return undefined;
  }

  return priorityMap.get(rawPriority.toLowerCase());
}

function dateValue(value: string | null | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function requiredDate(value: string | null | undefined): Date {
  return dateValue(value) ?? new Date(0);
}

function providerTicketUrl(baseUrl: string, ticketId: number): string {
  return `${baseUrl}/#ticket/zoom/${ticketId}`;
}

function participantRole(direction: TicketArticleDirection): TicketParticipantRole {
  if (direction === "inbound") {
    return "customer";
  }
  if (direction === "outbound" || direction === "internal") {
    return "agent";
  }
  if (direction === "system") {
    return "system";
  }
  return "unknown";
}

function articleDirection(article: ZammadArticle): TicketArticleDirection {
  if (article.internal) {
    return "internal";
  }

  const sender = article.sender?.toLowerCase() ?? "";
  if (sender.includes("customer")) {
    return "inbound";
  }
  if (sender.includes("agent")) {
    return "outbound";
  }
  if (sender.includes("system")) {
    return "system";
  }

  return "unknown";
}

function articleKind(article: ZammadArticle): TicketArticleKind {
  const type = article.type?.toLowerCase() ?? "";
  if (type.includes("note")) {
    return "note";
  }
  if (type.includes("system")) {
    return "system_event";
  }
  if (type) {
    return "message";
  }
  return "unknown";
}

function recipientValues(value: string | string[] | null | undefined): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  return value ? [value] : [];
}

function recipients(
  article: ZammadArticle,
  assets?: ZammadAssets,
): TicketArticleRecipient[] {
  return [
    ...recipientValues(article.to).map((value) => ({
      channel: "to" as const,
      ...recipientParticipant(value, assets),
    })),
    ...recipientValues(article.cc).map((value) => ({
      channel: "cc" as const,
      ...recipientParticipant(value, assets),
    })),
  ];
}

function isContentAlternativeAttachment(
  attachment: ZammadArticle["attachments"][number],
): boolean {
  return attachment.preferences?.["content-alternative"] === true;
}

function attachments(article: ZammadArticle): TicketAttachment[] {
  return article.attachments
    .filter((attachment) => !isContentAlternativeAttachment(attachment))
    .map((attachment) => ({
      externalId: String(attachment.id),
      fileName: attachment.filename ?? attachment.name ?? "attachment",
      contentType: attachmentContentType(attachment.preferences),
      byteSize: attachmentByteSize(attachment.size),
    }));
}

function attachmentContentType(
  preferences: ZammadArticle["attachments"][number]["preferences"],
): string | undefined {
  const value = preferences?.["Content-Type"] ?? preferences?.["Mime-Type"];
  return typeof value === "string" ? value : undefined;
}

function attachmentByteSize(
  size: ZammadArticle["attachments"][number]["size"],
): number | undefined {
  if (typeof size === "number") {
    return size;
  }

  if (typeof size !== "string") {
    return undefined;
  }

  const parsed = Number(size);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function textPreview(html: string): string | undefined {
  const preview = html.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
  return preview ? preview.slice(0, 180) : undefined;
}

export function mapTicket(
  ticket: ZammadTicket,
  baseUrl: string,
  assets?: ZammadAssets,
): Ticket {
  const state =
    namedReferenceValue(ticket.state) ??
    namedAssetValue(assets?.State, ticket.state_id);
  const priority =
    namedReferenceValue(ticket.priority) ??
    namedAssetValue(assets?.TicketPriority, ticket.priority_id) ??
    namedAssetValue(assets?.Priority, ticket.priority_id);
  const group =
    namedReferenceValue(ticket.group) ??
    namedAssetValue(assets?.Group, ticket.group_id);
  const organization =
    namedReferenceValue(ticket.organization) ??
    namedAssetValue(assets?.Organization, ticket.organization_id);

  const mappedTicket: Ticket = {
    externalId: String(ticket.id),
    number: ticket.number,
    title: ticket.title,
    customer: participantFromReference({
      assets,
      fallback: ticket.customer,
      id: ticket.customer_id,
      organization,
      role: "customer",
    }),
    owner: participantFromReference({
      assets,
      fallback: ticket.owner,
      id: ticket.owner_id,
      role: "agent",
    }),
    group: group ? { externalId: relationId(ticket.group_id), name: group } : undefined,
    state: mapState(state),
    priority: mapPriority(priority),
    createdAt: dateValue(ticket.created_at),
    updatedAt: requiredDate(ticket.updated_at),
    pendingUntil: dateValue(ticket.pending_time),
    tags: [],
    providerUrl: providerTicketUrl(baseUrl, ticket.id),
  };
  const mutationConstraints = zammadMetadataMutationConstraints(mappedTicket);

  return {
    ...mappedTicket,
    ...(mutationConstraints
      ? { metadataMutationConstraints: mutationConstraints }
      : {}),
  };
}

export function mapTicketListItem(
  ticket: ZammadTicket,
  baseUrl: string,
  assets?: ZammadAssets,
): TicketListItem {
  return mapTicket(ticket, baseUrl, assets);
}

export function mapArticle(
  article: ZammadArticle,
  assets?: ZammadAssets,
): TicketArticle {
  const direction = articleDirection(article);
  const sanitizedHtml = sanitizeProviderHtml(article.body ?? "");
  const role = participantRole(direction);

  return {
    externalId: String(article.id),
    kind: articleKind(article),
    visibility: article.internal ? "internal" : "public",
    direction,
    author: articleAuthor(article, assets, role),
    recipients: recipients(article, assets),
    createdAt: requiredDate(article.created_at),
    subject: article.subject ?? undefined,
    sanitizedHtml,
    textPreview: textPreview(sanitizedHtml),
    attachments: attachments(article),
  };
}

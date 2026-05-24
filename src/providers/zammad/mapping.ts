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
import type { ZammadArticle, ZammadTicket } from "./schemas";

const stateMap = new Map<string, TicketState>([
  ["new", "new"],
  ["open", "open"],
  ["pending reminder", "pending_reminder"],
  ["pending close", "pending_close"],
  ["closed", "closed"],
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

function recipients(article: ZammadArticle): TicketArticleRecipient[] {
  return [
    ...recipientValues(article.to).map((name) => ({ channel: "to" as const, name })),
    ...recipientValues(article.cc).map((name) => ({ channel: "cc" as const, name })),
  ];
}

function attachments(article: ZammadArticle): TicketAttachment[] {
  return article.attachments.map((attachment) => ({
    externalId: String(attachment.id),
    fileName: attachment.filename ?? attachment.name ?? "attachment",
    contentType: attachment.preferences?.["Content-Type"],
    byteSize: attachment.size ?? undefined,
  }));
}

function textPreview(html: string): string | undefined {
  const preview = html.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
  return preview ? preview.slice(0, 180) : undefined;
}

export function mapTicket(ticket: ZammadTicket, baseUrl: string): Ticket {
  return {
    externalId: String(ticket.id),
    number: ticket.number,
    title: ticket.title,
    customer: ticket.customer ? { name: ticket.customer, role: "customer" } : undefined,
    owner: ticket.owner ? { name: ticket.owner, role: "agent" } : undefined,
    group: ticket.group ? { name: ticket.group } : undefined,
    state: mapState(ticket.state ?? undefined),
    priority: mapPriority(ticket.priority ?? undefined),
    createdAt: dateValue(ticket.created_at),
    updatedAt: requiredDate(ticket.updated_at),
    pendingUntil: dateValue(ticket.pending_time),
    tags: [],
    providerUrl: providerTicketUrl(baseUrl, ticket.id),
  };
}

export function mapTicketListItem(
  ticket: ZammadTicket,
  baseUrl: string,
): TicketListItem {
  return mapTicket(ticket, baseUrl);
}

export function mapArticle(article: ZammadArticle): TicketArticle {
  const direction = articleDirection(article);
  const sanitizedHtml = sanitizeProviderHtml(article.body ?? "");

  return {
    externalId: String(article.id),
    kind: articleKind(article),
    visibility: article.internal ? "internal" : "public",
    direction,
    author: {
      name: article.created_by ?? article.from ?? article.sender ?? "Unknown",
      role: participantRole(direction),
    },
    recipients: recipients(article),
    createdAt: requiredDate(article.created_at),
    subject: article.subject ?? undefined,
    sanitizedHtml,
    textPreview: textPreview(sanitizedHtml),
    attachments: attachments(article),
  };
}

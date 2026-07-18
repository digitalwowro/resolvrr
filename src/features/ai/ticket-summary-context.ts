import sanitizeHtml from "sanitize-html";
import type { TicketArticle, TicketDetail } from "@/core/tickets";

const maxArticleCount = 12;
const maxArticleTextLength = 1200;
const maxPromptLength = 18000;

export const ticketSummarySanitizationVersion = "sanitize-html-plain-text-v1";

export type TicketSummaryPromptContext = {
  articleCount: number;
  prompt: string;
  ticketNumber: string;
  ticketUpdatedAt: string;
};

function plainTextFromSanitizedHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedAttributes: {},
    allowedTags: [],
    disallowedTagsMode: "discard",
  })
    .replace(/\s+/gu, " ")
    .trim();
}

function truncate(value: string, maxLength: number): string {
  return value.length > maxLength
    ? `${value.slice(0, Math.max(0, maxLength - 1)).trimEnd()}...`
    : value;
}

function participantLabel(value: { email?: string; name?: string } | undefined) {
  return value?.name ?? value?.email ?? "Unknown";
}

function articleLine(article: TicketArticle): string {
  const body = truncate(
    plainTextFromSanitizedHtml(article.sanitizedHtml),
    maxArticleTextLength,
  );
  return [
    `- ${article.createdAt.toISOString()}`,
    `visibility=${article.visibility}`,
    `direction=${article.direction}`,
    `author=${participantLabel(article.author)}`,
    `body=${body || "[empty]"}`,
  ].join(" | ");
}

function displayTicketNumber(number: string) {
  return number.startsWith("#") ? number : `#${number}`;
}

export function ticketSummaryPromptContext(
  detail: TicketDetail,
): TicketSummaryPromptContext {
  const articles = [...detail.thread.articles]
    .sort((first, second) => first.createdAt.getTime() - second.createdAt.getTime())
    .slice(-maxArticleCount);
  const lines = [
    `Ticket: ${displayTicketNumber(detail.ticket.number)}`,
    `Title: ${detail.ticket.title}`,
    `State: ${detail.ticket.state ?? "unknown"}`,
    `Priority: ${detail.ticket.priority ?? "unknown"}`,
    `Customer: ${participantLabel(detail.ticket.customer)}`,
    ...(detail.ticket.customer?.organization
      ? [`Customer organization: ${detail.ticket.customer.organization}`]
      : []),
    `Owner: ${participantLabel(detail.ticket.owner)}`,
    `Group: ${detail.ticket.group?.name ?? "Unassigned"}`,
    `Tags: ${detail.ticket.tags.join(", ") || "none"}`,
    `Created: ${detail.ticket.createdAt?.toISOString() ?? "unknown"}`,
    `Updated: ${detail.ticket.updatedAt.toISOString()}`,
    `Articles included: ${articles.length} of ${detail.thread.articles.length}`,
    "",
    "Thread:",
    ...articles.map(articleLine),
  ];

  return {
    articleCount: detail.thread.articles.length,
    prompt: truncate(lines.join("\n"), maxPromptLength),
    ticketNumber: displayTicketNumber(detail.ticket.number),
    ticketUpdatedAt: detail.ticket.updatedAt.toISOString(),
  };
}

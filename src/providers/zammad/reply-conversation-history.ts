import { createHash } from "node:crypto";
import { ProviderError } from "@/core/providers";
import {
  visibleTicketArticleMessageHtml,
} from "@/core/ticket-article-content";
import type {
  TicketConversationHistoryContext,
  TicketConversationHistoryScope,
} from "@/core/ticket-conversation-history";
import {
  normalizeZammadSignatureBodyResult,
  sanitizeZammadArticleBody,
  zammadArticleSignatureDetectionLine,
} from "./article-body";
import {
  classifyZammadArticleAttachments,
  zammadInlineAttachmentIdForSource,
} from "./article-attachments";
import { mapArticle } from "./mapping";
import type { ZammadArticle, ZammadAssets } from "./schemas";

const maxConversationHistoryHtmlBytes = 20 * 1024 * 1024;

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function historyMismatch(code: string): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk conversation history could not be prepared.",
    false,
    undefined,
    code,
  );
}

function stableProviderValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableProviderValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableProviderValue(item)]),
    );
  }
  return value;
}

export function eligibleZammadReplyHistoryArticles(
  articles: ZammadArticle[],
): ZammadArticle[] {
  return articles
    .filter((article) => {
      const type = article.type?.toLowerCase();
      const sender = article.sender?.toLowerCase() ?? "";
      return article.internal === false &&
        (type === "email" || type === "web" || type === "phone") &&
        (sender.includes("agent") || sender.includes("customer")) &&
        Boolean(article.body?.trim());
    })
    .sort((left, right) => {
      const timeDifference =
        Date.parse(right.created_at ?? "") - Date.parse(left.created_at ?? "");
      return Number.isFinite(timeDifference) && timeDifference !== 0
        ? timeDifference
        : right.id - left.id;
    });
}

export function scopedZammadReplyHistoryArticles(
  articles: ZammadArticle[],
  scope: TicketConversationHistoryScope,
  sourceArticleId?: number,
): ZammadArticle[] {
  const eligible = eligibleZammadReplyHistoryArticles(articles);
  if (scope === "current") return eligible;
  if (sourceArticleId === undefined) return [];
  const sourceIndex = eligible.findIndex((article) =>
    article.id === sourceArticleId
  );
  return sourceIndex === -1 ? [] : eligible.slice(sourceIndex);
}

export function zammadReplyConversationHistoryContext(
  articles: ZammadArticle[],
  scope: TicketConversationHistoryScope = "current",
  sourceArticleId?: number,
): TicketConversationHistoryContext | undefined {
  const eligible = scopedZammadReplyHistoryArticles(
    articles,
    scope,
    sourceArticleId,
  );
  if (!eligible.length) return undefined;
  const contextVersion = createHash("sha256")
    .update(JSON.stringify({
      articles: eligible.map((article) => ({
        attachments: article.attachments.map((attachment) => ({
          filename: attachment.filename,
          id: attachment.id,
          name: attachment.name,
          preferences: stableProviderValue(attachment.preferences),
          size: attachment.size,
        })),
        body: article.body,
        cc: article.cc,
        contentType: article.content_type,
        createdAt: article.created_at,
        createdBy: stableProviderValue(article.created_by),
        createdById: article.created_by_id,
        from: article.from,
        id: article.id,
        sender: article.sender,
        subject: article.subject,
        to: article.to,
        ticketId: article.ticket_id,
        type: article.type,
        updatedAt: article.updated_at,
      })),
      scope,
    }))
    .digest("hex");
  return { contextVersion, messageCount: eligible.length, scope };
}

function attachmentNames(article: ZammadArticle): string {
  const names = classifyZammadArticleAttachments(article).visible
    .map((attachment) => attachment.filename ?? attachment.name ?? "attachment");
  return names.length
    ? `<div><strong>Attachments:</strong> ${names.map(escapeHtml).join(", ")}</div>`
    : "";
}

function addressValue(
  value: string | string[] | null | undefined,
): string {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function imageKey(articleId: number, attachmentId: number): string {
  return `${articleId}:${attachmentId}`;
}

export function zammadVisibleReplyHistoryArticleBody(
  article: ZammadArticle,
): string {
  const body = article.content_type?.toLowerCase() === "text/plain"
    ? `<p>${escapeHtml(article.body ?? "").replace(/\n/gu, "<br>")}</p>`
    : article.body ?? "";
  const normalized = normalizeZammadSignatureBodyResult(
    body,
    zammadArticleSignatureDetectionLine(article),
  );
  return visibleTicketArticleMessageHtml(
    normalized.html,
    { signatureHints: normalized.signatureHints },
  );
}

function articleBody(
  article: ZammadArticle,
  inlineImages: Map<string, string>,
): string {
  return sanitizeZammadArticleBody(
    zammadVisibleReplyHistoryArticleBody(article),
    {
    rewriteImageSource: (source) => {
      const attachmentId = zammadInlineAttachmentIdForSource(article, source);
      return attachmentId === undefined
        ? undefined
        : inlineImages.get(imageKey(article.id, attachmentId));
    },
    },
  );
}

export function zammadReplyConversationHistoryHtml(input: {
  articles: ZammadArticle[];
  assets?: ZammadAssets;
  inlineImages: Map<string, string>;
  scope?: TicketConversationHistoryScope;
  sourceArticleId?: number;
}): string {
  const articles = scopedZammadReplyHistoryArticles(
    input.articles,
    input.scope ?? "current",
    input.sourceArticleId,
  );
  if (!articles.length) throw historyMismatch("reply-history-unavailable");
  const messages = articles.map((article) => {
    const mapped = mapArticle(article, input.assets);
    const author = mapped.author.name ?? mapped.author.email ?? article.from ?? "Unknown sender";
    const date = article.created_at ?? "";
    const header = date
      ? `On ${escapeHtml(date)}, ${escapeHtml(author)} wrote:`
      : `${escapeHtml(author)} wrote:`;
    const recipientHeaders = [
      ["From", article.from ?? author],
      ["To", addressValue(article.to)],
      ["Cc", addressValue(article.cc)],
    ].flatMap(([label, value]) =>
      value ? [`<div><strong>${label}:</strong> ${escapeHtml(value)}</div>`] : []
    ).join("");
    return [
      `<div><strong>${header}</strong></div>`,
      recipientHeaders,
      `<div>${articleBody(article, input.inlineImages)}</div>`,
      attachmentNames(article),
    ].join("");
  });
  const html = [
    '<div><br></div><blockquote type="cite">',
    "<div>---------- Conversation history ----------</div><br>",
    messages.join("<br>"),
    "</blockquote>",
  ].join("");
  if (Buffer.byteLength(html, "utf8") > maxConversationHistoryHtmlBytes) {
    throw historyMismatch("reply-history-too-large");
  }
  return html;
}

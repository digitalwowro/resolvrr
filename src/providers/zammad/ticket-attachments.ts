import {
  maxTicketAttachmentDownloadBytes,
  type TicketAttachmentFile,
  type TicketAttachmentLocator,
} from "@/core/ticket-attachments";
import { ProviderError, type ProviderContext } from "@/core/providers";
import {
  classifyZammadArticleAttachments,
  zammadAttachmentContentType,
  type ZammadArticleAttachment,
} from "./article-attachments";
import { zammadGetBytes, zammadGetJson } from "./client";
import { zammadArticleSchema } from "./schemas";
import { zammadTicketId } from "./ticket-id";

function unavailable(code: string): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    false,
    undefined,
    code,
  );
}

function safeContentType(attachment: ZammadArticleAttachment): string {
  const value = zammadAttachmentContentType(attachment)
    ?.split(";", 1)[0]
    ?.trim();
  return value && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/iu.test(value)
    ? value.toLowerCase()
    : "application/octet-stream";
}

function safeFileName(attachment: ZammadArticleAttachment): string {
  const value = attachment.filename ?? attachment.name ?? "attachment";
  return value.replace(/[\0\r\n]/gu, "").slice(0, 255) || "attachment";
}

export async function getZammadTicketAttachment(
  context: ProviderContext,
  input: TicketAttachmentLocator,
): Promise<TicketAttachmentFile> {
  const ticketId = zammadTicketId(input.ticketExternalId);
  const articleId = zammadTicketId(input.articleExternalId);
  const attachmentId = zammadTicketId(input.attachmentExternalId);
  const rawArticle = await zammadGetJson(
    context,
    `/api/v1/ticket_articles/${articleId}`,
  );
  const article = zammadArticleSchema.safeParse(rawArticle);
  if (!article.success || article.data.ticket_id !== ticketId) {
    throw unavailable("attachment-unavailable");
  }

  const attachment = classifyZammadArticleAttachments(article.data).visible.find(
    (candidate) => candidate.id === attachmentId,
  );
  if (!attachment) throw unavailable("attachment-unavailable");

  const declaredSize = Number(attachment.size);
  if (
    Number.isFinite(declaredSize) &&
    declaredSize > maxTicketAttachmentDownloadBytes
  ) {
    throw unavailable("attachment-too-large");
  }

  const bytes = await zammadGetBytes(
    context,
    `/api/v1/ticket_attachment/${ticketId}/${articleId}/${attachmentId}`,
    maxTicketAttachmentDownloadBytes,
    "attachment-too-large",
  );
  if (
    Number.isFinite(declaredSize) &&
    declaredSize >= 0 &&
    declaredSize !== bytes.byteLength
  ) {
    throw unavailable("attachment-stale");
  }

  return {
    bytes,
    contentType: safeContentType(attachment),
    fileName: safeFileName(attachment),
  };
}

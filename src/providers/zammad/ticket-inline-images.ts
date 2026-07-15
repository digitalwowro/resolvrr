import { ProviderError, type ProviderContext } from "@/core/providers";
import {
  ticketInlineImageContentTypes,
  type TicketInlineImage,
  type TicketInlineImageContentType,
  type TicketInlineImageLocator,
} from "@/core/ticket-inline-images";
import {
  classifyZammadArticleAttachments,
  zammadAttachmentContentType,
} from "./article-attachments";
import { zammadGetBytes, zammadGetJson } from "./client";
import { zammadArticleSchema } from "./schemas";
import { zammadTicketId } from "./ticket-id";

const maxInlineImageBytes = 5 * 1024 * 1024;
const allowedContentTypes = new Set<string>(ticketInlineImageContentTypes);

function unavailable(code: string): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    false,
    undefined,
    code,
  );
}

function safeContentType(value: string | undefined): TicketInlineImageContentType {
  const normalized = value?.split(";", 1)[0]?.trim().toLowerCase();
  if (!normalized || !allowedContentTypes.has(normalized)) {
    throw unavailable("inline-image-type-unsupported");
  }
  return normalized as TicketInlineImageContentType;
}

export async function getZammadTicketInlineImage(
  context: ProviderContext,
  input: TicketInlineImageLocator,
): Promise<TicketInlineImage> {
  const ticketId = zammadTicketId(input.ticketExternalId);
  const articleId = zammadTicketId(input.articleExternalId);
  const attachmentId = zammadTicketId(input.attachmentExternalId);
  const rawArticle = await zammadGetJson(
    context,
    `/api/v1/ticket_articles/${articleId}`,
  );
  const article = zammadArticleSchema.safeParse(rawArticle);
  if (!article.success || article.data.ticket_id !== ticketId) {
    throw unavailable("inline-image-unavailable");
  }

  const attachment = classifyZammadArticleAttachments(article.data).inline.find(
    (candidate) => candidate.id === attachmentId,
  );
  if (!attachment) throw unavailable("inline-image-unavailable");
  const contentType = safeContentType(zammadAttachmentContentType(attachment));
  const declaredSize = Number(attachment.size);
  if (Number.isFinite(declaredSize) && declaredSize > maxInlineImageBytes) {
    throw unavailable("inline-image-too-large");
  }

  const bytes = await zammadGetBytes(
    context,
    `/api/v1/ticket_attachment/${ticketId}/${articleId}/${attachmentId}`,
    maxInlineImageBytes,
    "inline-image-too-large",
  );
  if (
    Number.isFinite(declaredSize) &&
    declaredSize >= 0 &&
    declaredSize !== bytes.byteLength
  ) {
    throw unavailable("inline-image-stale");
  }

  return { bytes, contentType };
}

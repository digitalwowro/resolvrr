import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  TicketConversationHistoryScope,
} from "@/core/ticket-conversation-history";
import {
  classifyZammadArticleAttachments,
  zammadAttachmentContentType,
} from "./article-attachments";
import { zammadGetBytes } from "./client";
import {
  scopedZammadReplyHistoryArticles,
  zammadVisibleReplyHistoryArticleBody,
} from "./reply-conversation-history";
import type { ZammadArticle } from "./schemas";

const maxInlineImageBytes = 10 * 1024 * 1024;
const maxTotalInlineImageBytes = 25 * 1024 * 1024;
const inlineImageConcurrency = 6;
// Rich email signatures commonly contain several tiny images. A modest ticket
// can therefore exceed a low item-count ceiling while remaining well inside
// the byte budget. Keep a high request-amplification bound, and use the byte
// limits above as the primary payload-size protection.
const maxInlineImages = 100;

function historyTooLarge(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk conversation history is too large to include.",
    false,
    undefined,
    "reply-history-too-large",
  );
}

function safeImageContentType(
  attachment: ZammadArticle["attachments"][number],
): string | undefined {
  const contentType = zammadAttachmentContentType(attachment)?.toLowerCase();
  return contentType?.startsWith("image/") ? contentType : undefined;
}

type InlineImageResource = {
  article: ZammadArticle;
  attachment: ZammadArticle["attachments"][number];
  contentType: string;
};

function declaredResourceSize(resource: InlineImageResource) {
  const size = Number(resource.attachment.size);
  return Number.isFinite(size) && size >= 0 ? size : undefined;
}

async function loadInlineImage(input: {
  context: ProviderContext;
  resource: InlineImageResource;
  ticketId: number;
}) {
  const { article, attachment, contentType } = input.resource;
  const declaredSize = declaredResourceSize(input.resource);
  const bytes = await zammadGetBytes(
    input.context,
    `/api/v1/ticket_attachment/${input.ticketId}/${article.id}/${attachment.id}`,
    declaredSize === undefined
      ? maxInlineImageBytes
      : Math.max(1, Math.min(maxInlineImageBytes, declaredSize)),
    "reply-history-too-large",
  );
  if (declaredSize !== undefined && bytes.byteLength !== declaredSize) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk conversation history changed.",
      false,
      undefined,
      "reply-history-context-stale",
    );
  }
  return {
    bytes: bytes.byteLength,
    dataUrl: `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`,
    key: `${article.id}:${attachment.id}`,
  };
}

export async function loadZammadReplyHistoryInlineImages(input: {
  articles: ZammadArticle[];
  context: ProviderContext;
  scope?: TicketConversationHistoryScope;
  sourceArticleId?: number;
  ticketId: number;
}): Promise<Map<string, string>> {
  const resources = scopedZammadReplyHistoryArticles(
    input.articles,
    input.scope ?? "current",
    input.sourceArticleId,
  )
    .flatMap((article) => {
      const visibleArticle = {
        ...article,
        body: zammadVisibleReplyHistoryArticleBody(article),
      };
      return classifyZammadArticleAttachments(visibleArticle).inline.flatMap((attachment) => {
        const contentType = safeImageContentType(attachment);
        return contentType ? [{ article, attachment, contentType }] : [];
      });
    });
  if (resources.length > maxInlineImages) throw historyTooLarge();

  const declaredTotal = resources.reduce<number | undefined>((total, resource) => {
    const size = declaredResourceSize(resource);
    return total === undefined || size === undefined ? undefined : total + size;
  }, 0);
  if (declaredTotal !== undefined && declaredTotal > maxTotalInlineImageBytes) {
    throw historyTooLarge();
  }

  const images = new Map<string, string>();
  let totalBytes = 0;
  for (let index = 0; index < resources.length; index += inlineImageConcurrency) {
    const batch = resources.slice(index, index + inlineImageConcurrency);
    const loaded = await Promise.all(batch.map((resource) => loadInlineImage({
      context: input.context,
      resource,
      ticketId: input.ticketId,
    })));
    totalBytes += loaded.reduce((total, image) => total + image.bytes, 0);
    if (totalBytes > maxTotalInlineImageBytes) throw historyTooLarge();
    for (const image of loaded) images.set(image.key, image.dataUrl);
  }
  return images;
}

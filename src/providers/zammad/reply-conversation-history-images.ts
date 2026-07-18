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
const maxInlineImages = 25;

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

  const images = new Map<string, string>();
  let totalBytes = 0;
  for (const { article, attachment, contentType } of resources) {
    const remaining = maxTotalInlineImageBytes - totalBytes;
    if (remaining <= 0) throw historyTooLarge();
    const bytes = await zammadGetBytes(
      input.context,
      `/api/v1/ticket_attachment/${input.ticketId}/${article.id}/${attachment.id}`,
      Math.min(maxInlineImageBytes, remaining),
      "reply-history-too-large",
    );
    const declaredSize = Number(attachment.size);
    if (
      Number.isFinite(declaredSize) &&
      declaredSize >= 0 &&
      bytes.byteLength !== declaredSize
    ) {
      throw new ProviderError(
        "provider-data-mismatch",
        "The helpdesk conversation history changed.",
        false,
        undefined,
        "reply-history-context-stale",
      );
    }
    totalBytes += bytes.byteLength;
    images.set(
      `${article.id}:${attachment.id}`,
      `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`,
    );
  }
  return images;
}

import { ProviderError, type ProviderContext } from "@/core/providers";
import {
  classifyZammadArticleAttachments,
  zammadAttachmentContentType,
  type ZammadArticleAttachment,
} from "./article-attachments";
import { zammadGetBytes } from "./client";
import type { ZammadArticle } from "./schemas";

const maxAttachmentBytes = 10 * 1024 * 1024;
const maxTotalAttachmentBytes = 25 * 1024 * 1024;
const maxForwardAttachments = 25;
const maxInlineResources = 25;

type DownloadedAttachment = {
  attachment: ZammadArticleAttachment;
  data: Uint8Array;
};

function mismatch(code: string): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    false,
    undefined,
    code,
  );
}

function safeFileName(attachment: ZammadArticleAttachment): string {
  const value = attachment.filename ?? attachment.name ?? "attachment";
  return value.replace(/[\0\r\n]/gu, "").slice(0, 255) || "attachment";
}

function safeContentType(attachment: ZammadArticleAttachment): string {
  const value = zammadAttachmentContentType(attachment);
  return value && /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/iu.test(value)
    ? value.toLowerCase()
    : "application/octet-stream";
}

function declaredSize(attachment: ZammadArticleAttachment): number {
  const size = Number(attachment.size);
  return Number.isFinite(size) && size > 0 ? size : 0;
}

async function downloadAttachments(
  context: ProviderContext,
  ticketId: number,
  articleId: number,
  attachments: ZammadArticleAttachment[],
): Promise<DownloadedAttachment[]> {
  const declaredTotal = attachments.reduce(
    (sum, attachment) => sum + declaredSize(attachment),
    0,
  );
  if (declaredTotal > maxTotalAttachmentBytes) {
    throw mismatch("forward-attachments-too-large");
  }

  const downloads: DownloadedAttachment[] = [];
  let receivedTotal = 0;
  for (const attachment of attachments) {
    const remaining = maxTotalAttachmentBytes - receivedTotal;
    if (remaining <= 0) throw mismatch("forward-attachments-too-large");
    const data = await zammadGetBytes(
      context,
      `/api/v1/ticket_attachment/${ticketId}/${articleId}/${attachment.id}`,
      Math.min(maxAttachmentBytes, remaining),
      "forward-attachments-too-large",
    );
    const expectedSize = Number(attachment.size);
    if (
      Number.isFinite(expectedSize) &&
      expectedSize >= 0 &&
      data.byteLength !== expectedSize
    ) {
      throw mismatch("forward-context-stale");
    }
    receivedTotal += data.byteLength;
    downloads.push({ attachment, data });
  }
  return downloads;
}

function selectedVisibleAttachments(
  visible: ZammadArticleAttachment[],
  selectedIds: string[],
): ZammadArticleAttachment[] {
  const uniqueIds = [...new Set(selectedIds)];
  if (uniqueIds.length > maxForwardAttachments) {
    throw mismatch("forward-attachments-too-large");
  }
  return uniqueIds.map((externalId) => {
    if (!/^\d+$/u.test(externalId)) throw mismatch("invalid-forward-attachment");
    const attachment = visible.find((item) => String(item.id) === externalId);
    if (!attachment) throw mismatch("invalid-forward-attachment");
    return attachment;
  });
}

export async function prepareZammadForwardAttachments(input: {
  article: ZammadArticle;
  context: ProviderContext;
  includeOriginal: boolean;
  selectedIds: string[];
  ticketId: number;
}): Promise<{
  attachments: Array<{ data: string; filename: string; "mime-type": string }>;
  inlineImages: Map<string, string>;
}> {
  const classified = classifyZammadArticleAttachments(input.article);
  const selected = selectedVisibleAttachments(classified.visible, input.selectedIds);
  const inline = input.includeOriginal
    ? classified.inline.filter((attachment) =>
        safeContentType(attachment).startsWith("image/"),
      )
    : [];
  if (inline.length > maxInlineResources) {
    throw mismatch("forward-attachments-too-large");
  }

  const requested = [...selected, ...inline];
  const downloads = await downloadAttachments(
    input.context,
    input.ticketId,
    input.article.id,
    requested,
  );
  const selectedIds = new Set(selected.map((attachment) => attachment.id));
  const inlineIds = new Set(inline.map((attachment) => attachment.id));
  const attachments = downloads.flatMap(({ attachment, data }) =>
    selectedIds.has(attachment.id)
      ? [{
          data: Buffer.from(data).toString("base64"),
          filename: safeFileName(attachment),
          "mime-type": safeContentType(attachment),
        }]
      : [],
  );
  const inlineImages = new Map<string, string>();
  for (const { attachment, data } of downloads) {
    if (!inlineIds.has(attachment.id)) continue;
    const contentType = safeContentType(attachment);
    inlineImages.set(
      String(attachment.id),
      `data:${contentType};base64,${Buffer.from(data).toString("base64")}`,
    );
  }

  return { attachments, inlineImages };
}

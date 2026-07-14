import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketCustomerForwardInput } from "@/core/ticket-forwards";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import { zammadGetBytes, zammadGetJson, zammadSendJson } from "./client";
import { zammadForwardBody } from "./forward-body";
import { zammadForwardContext } from "./forward-context";
import { zammadArticleSchema } from "./schemas";
import { zammadTicketId } from "./ticket-id";
import {
  assertZammadTicketNotMerged,
  zammadTicketPayload,
} from "./ticket-mutation-preflight";

const recipientSchema = z.string().trim().toLowerCase().max(254).email();
const maxAttachmentBytes = 10 * 1024 * 1024;
const maxTotalAttachmentBytes = 25 * 1024 * 1024;
const maxForwardAttachments = 25;

function mismatch(code: string): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    false,
    undefined,
    code,
  );
}

function recipients(input: TicketCustomerForwardInput) {
  const seen = new Set<string>();
  const unique = (values: string[]) => values.flatMap((value) => {
    const parsed = recipientSchema.safeParse(value);
    if (!parsed.success || seen.has(parsed.data)) return [];
    seen.add(parsed.data);
    return [parsed.data];
  });
  const to = unique(input.to);
  const cc = unique(input.cc);
  if (to.length + cc.length === 0) throw mismatch("invalid-recipient");
  return { to, cc };
}

function validSubject(subject: string): string | undefined {
  const value = subject.trim();
  return value && value.length <= 500 && !/[\r\n\0]/u.test(value)
    ? value
    : undefined;
}

function attachmentMetadata(attachment: z.infer<typeof zammadArticleSchema>["attachments"][number]) {
  const preferences = attachment.preferences;
  const contentType = preferences?.["Content-Type"] ?? preferences?.["Mime-Type"];
  const contentId = preferences?.["Content-ID"] ?? preferences?.["content-id"];
  const rawFileName = attachment.filename ?? attachment.name ?? "attachment";
  return {
    contentId: typeof contentId === "string"
      ? contentId.replace(/^<|>$/gu, "").toLowerCase()
      : undefined,
    contentType: typeof contentType === "string" &&
      /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/iu.test(contentType)
      ? contentType.toLowerCase()
      : "application/octet-stream",
    fileName: rawFileName.replace(/[\0\r\n]/gu, "").slice(0, 255) || "attachment",
  };
}

async function selectedAttachments(
  context: ProviderContext,
  ticketId: number,
  article: z.infer<typeof zammadArticleSchema>,
  selectedIds: string[],
) {
  const uniqueIds = [...new Set(selectedIds)];
  if (uniqueIds.length > maxForwardAttachments) {
    throw mismatch("forward-attachments-too-large");
  }
  const selected = uniqueIds.map((externalId) => {
    if (!/^\d+$/u.test(externalId)) throw mismatch("invalid-forward-attachment");
    const attachment = article.attachments.find((item) => String(item.id) === externalId);
    if (!attachment) throw mismatch("invalid-forward-attachment");
    return attachment;
  });
  const declaredTotal = selected.reduce((sum, attachment) => {
    const size = Number(attachment.size);
    return sum + (Number.isFinite(size) && size > 0 ? size : 0);
  }, 0);
  if (declaredTotal > maxTotalAttachmentBytes) {
    throw mismatch("forward-attachments-too-large");
  }
  const downloads: Array<{ attachment: (typeof selected)[number]; data: Uint8Array }> = [];
  let receivedTotal = 0;
  for (const attachment of selected) {
    const remaining = maxTotalAttachmentBytes - receivedTotal;
    if (remaining <= 0) throw mismatch("forward-attachments-too-large");
    const data = await zammadGetBytes(
      context,
      `/api/v1/ticket_attachment/${ticketId}/${article.id}/${attachment.id}`,
      Math.min(maxAttachmentBytes, remaining),
    );
    const declaredSize = Number(attachment.size);
    if (Number.isFinite(declaredSize) && declaredSize >= 0 && data.byteLength !== declaredSize) {
      throw mismatch("forward-context-stale");
    }
    receivedTotal += data.byteLength;
    downloads.push({ attachment, data });
  }
  return downloads;
}

export async function forwardZammadTicketEmail(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketCustomerForwardInput,
): Promise<void> {
  const ticketId = zammadTicketId(ticketExternalId);
  const articleId = zammadTicketId(input.sourceArticleExternalId);
  const [rawTicket, rawArticle] = await Promise.all([
    zammadGetJson(context, `/api/v1/tickets/${ticketId}?expand=true&full=true`),
    zammadGetJson(context, `/api/v1/ticket_articles/${articleId}`),
  ]);
  const ticket = zammadTicketPayload(rawTicket);
  assertZammadTicketNotMerged(ticket);
  const article = zammadArticleSchema.safeParse(rawArticle);
  if (!article.success || article.data.ticket_id !== ticketId) {
    throw mismatch("forward-context-unavailable");
  }
  const forwardContext = zammadForwardContext(article.data, ticket.ticket.title);
  if (!forwardContext) throw mismatch("forward-context-unavailable");
  if (forwardContext.contextVersion !== input.contextVersion) {
    throw mismatch("forward-context-stale");
  }
  const subject = validSubject(input.subject);
  if (!subject) throw mismatch("invalid-forward-subject");
  if (!input.includeOriginal && !input.body.trim()) {
    throw new ProviderError("validation-failure", "Forward body is required without the original message.");
  }
  const normalizedRecipients = recipients(input);
  const downloads = await selectedAttachments(
    context,
    ticketId,
    article.data,
    input.attachmentExternalIds,
  );
  const inlineImages = new Map<string, string>();
  const attachments = downloads.map(({ attachment, data }) => {
    const metadata = attachmentMetadata(attachment);
    if (metadata.contentId && metadata.contentType.startsWith("image/")) {
      inlineImages.set(
        metadata.contentId,
        `data:${metadata.contentType};base64,${Buffer.from(data).toString("base64")}`,
      );
    }
    return {
      filename: metadata.fileName,
      data: Buffer.from(data).toString("base64"),
      "mime-type": metadata.contentType,
    };
  });
  const body = zammadForwardBody({
    article: article.data,
    body: input.bodyFormat === "html" ? sanitizeComposerHtml(input.body) : input.body.trim(),
    bodyFormat: input.bodyFormat === "html" ? "html" : "plain",
    includeOriginal: input.includeOriginal,
    inlineImages,
    subject,
  });
  let response: unknown;
  try {
    response = await zammadSendJson(context, "/api/v1/ticket_articles", "POST", {
      ticket_id: ticketId,
      to: normalizedRecipients.to.join(", "),
      cc: normalizedRecipients.cc.join(", "),
      subject,
      body: body.body,
      content_type: body.contentType,
      type: "email",
      internal: false,
      sender: "Agent",
      attachments,
    });
  } catch (error) {
    if (error instanceof ProviderError && error.kind === "temporary-provider-failure") {
      throw new ProviderError(error.kind, error.message, false, error.statusCode, "delivery-uncertain");
    }
    throw error;
  }
  if (!zammadArticleSchema.safeParse(response).success) {
    throw mismatch("delivery-uncertain");
  }
}

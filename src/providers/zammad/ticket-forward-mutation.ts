import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketCustomerForwardInput } from "@/core/ticket-forwards";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import { zammadGetJson, zammadSendJson } from "./client";
import { prepareZammadForwardAttachments } from "./forward-attachments";
import { zammadForwardBody } from "./forward-body";
import { zammadForwardContext } from "./forward-context";
import { zammadArticleSchema } from "./schemas";
import { zammadTicketId } from "./ticket-id";
import {
  assertZammadTicketNotMerged,
  zammadTicketPayload,
} from "./ticket-mutation-preflight";

const recipientSchema = z.string().trim().toLowerCase().max(254).email();

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
  const { attachments, inlineImages } = await prepareZammadForwardAttachments({
    article: article.data,
    context,
    includeOriginal: input.includeOriginal,
    selectedIds: input.attachmentExternalIds,
    ticketId,
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

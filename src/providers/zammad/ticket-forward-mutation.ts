import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type { ProviderTicketCustomerForwardInput } from "@/core/ticket-forwards";
import {
  isTicketConversationHistoryScope,
} from "@/core/ticket-conversation-history";
import { zammadGetJson, zammadSendJson } from "./client";
import { prepareZammadForwardAttachments } from "./forward-attachments";
import { zammadForwardContext } from "./forward-context";
import { zammadOutboundBody } from "./outbound-signature";
import {
  loadZammadReplyHistoryInlineImages,
} from "./reply-conversation-history-images";
import {
  zammadReplyConversationHistoryContext,
  zammadReplyConversationHistoryHtml,
} from "./reply-conversation-history";
import {
  zammadArticleListResponseSchema,
  zammadArticleSchema,
} from "./schemas";
import { zammadTicketId } from "./ticket-id";
import { zammadArticlePayloadRecords } from "./ticket-detail-payload";
import {
  assertZammadTicketNotMerged,
  zammadTicketPayload,
} from "./ticket-mutation-preflight";
import {
  rethrowZammadMentionWriteError,
  zammadMentionHtml,
} from "./ticket-mentions";

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

function recipients(input: ProviderTicketCustomerForwardInput) {
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
  input: ProviderTicketCustomerForwardInput,
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
  if (!input.includeConversationHistory && !input.body.trim()) {
    throw new ProviderError(
      "validation-failure",
      "Forward body is required without conversation history.",
    );
  }
  let conversationHistoryHtml: string | undefined;
  if (input.includeConversationHistory) {
    if (
      !input.conversationHistoryContextVersion ||
      !isTicketConversationHistoryScope(input.conversationHistoryScope)
    ) {
      throw mismatch("reply-history-unavailable");
    }
    const rawHistory = await zammadGetJson(
      context,
      `/api/v1/ticket_articles/by_ticket/${ticketId}?expand=true&full=true`,
    );
    if (!zammadArticleListResponseSchema.safeParse(rawHistory).success) {
      throw mismatch("reply-history-unavailable");
    }
    const history = zammadArticlePayloadRecords(rawHistory);
    const historyContext = zammadReplyConversationHistoryContext(
      history.articles,
      input.conversationHistoryScope,
      articleId,
    );
    if (
      !historyContext ||
      historyContext.contextVersion !== input.conversationHistoryContextVersion
    ) {
      throw mismatch("reply-history-context-stale");
    }
    const inlineImages = await loadZammadReplyHistoryInlineImages({
      articles: history.articles,
      context,
      scope: input.conversationHistoryScope,
      sourceArticleId: articleId,
      ticketId,
    });
    conversationHistoryHtml = zammadReplyConversationHistoryHtml({
      articles: history.articles,
      assets: history.assets,
      inlineImages,
      scope: input.conversationHistoryScope,
      sourceArticleId: articleId,
    });
  }
  const normalizedRecipients = recipients(input);
  const { attachments } = await prepareZammadForwardAttachments({
    article: article.data,
    context,
    selectedIds: input.attachmentExternalIds,
    ticketId,
  });
  const authoredBody = zammadMentionHtml(
    context,
    input.body,
    input.bodyFormat === "html" ? "html" : "plain",
  );
  const body = zammadOutboundBody({
    body: authoredBody,
    bodyFormat: input.bodyFormat,
    conversationHistoryHtml,
    signature: input.resolvedSignature,
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
    if (error instanceof ProviderError && error.statusCode === 422) {
      rethrowZammadMentionWriteError(error, input.body);
    }
    if (error instanceof ProviderError && error.kind === "temporary-provider-failure") {
      throw new ProviderError(error.kind, error.message, false, error.statusCode, "delivery-uncertain");
    }
    throw error;
  }
  if (!zammadArticleSchema.safeParse(response).success) {
    throw mismatch("delivery-uncertain");
  }
}

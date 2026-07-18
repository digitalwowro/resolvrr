import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type { ProviderTicketCustomerReplyInput } from "@/core/ticket-replies";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadSendJson } from "./client";
import { zammadArticleSchema } from "./schemas";
import { zammadTicketId } from "./ticket-id";
import { zammadOutboundBody } from "./outbound-signature";
import {
  rethrowZammadMentionWriteError,
  zammadMentionHtml,
} from "./ticket-mentions";
import { zammadReplyConversationHistoryHtml } from "./reply-conversation-history";
import {
  loadZammadReplyHistoryInlineImages,
} from "./reply-conversation-history-images";
import { freshZammadReplyContext } from "./ticket-customer-reply-context";

const recipientSchema = z.string().trim().toLowerCase().max(254).email();

function providerMismatch(code?: string): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    false,
    undefined,
    code,
  );
}

function normalizedRecipients(input: ProviderTicketCustomerReplyInput) {
  const seen = new Set<string>();
  const unique = (values: string[]) => values.flatMap((value) => {
    const parsed = recipientSchema.safeParse(value);
    if (!parsed.success || seen.has(parsed.data)) {
      return [];
    }
    seen.add(parsed.data);
    return [parsed.data];
  });
  const to = unique(input.to);
  const cc = unique(input.cc);
  if (to.length + cc.length === 0) {
    throw new ProviderError(
      "validation-failure",
      "At least one valid reply recipient is required.",
      false,
      undefined,
      "invalid-recipient",
    );
  }
  return { to, cc };
}

export async function addZammadTicketCustomerReply(
  context: ProviderContext,
  ticketExternalId: string,
  input: ProviderTicketCustomerReplyInput,
): Promise<void> {
  if (!input.body.trim()) {
    throw new ProviderError("validation-failure", "Customer reply body is required.");
  }
  if (
    input.includeConversationHistory &&
    (
      !input.conversationHistoryContextVersion ||
      !input.conversationHistoryScope
    )
  ) {
    throw providerMismatch("reply-history-unavailable");
  }
  const recipients = normalizedRecipients(input);
  const fresh = await measureTicketReadPhase(
    "provider-metadata-mutation-current-ticket-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () => freshZammadReplyContext(
      context,
      ticketExternalId,
      input.sourceArticleExternalId,
      input.includeConversationHistory,
      input.conversationHistoryScope,
    ),
  );
  if (fresh.replyContext.contextVersion !== input.contextVersion) {
    throw providerMismatch("reply-context-stale");
  }
  if (!fresh.replyContext.availableIntents.includes(input.intent)) {
    throw providerMismatch("unsupported-reply-intent");
  }
  let conversationHistoryHtml: string | undefined;
  if (input.includeConversationHistory) {
    const history = fresh.history;
    if (
      !input.conversationHistoryContextVersion ||
      !history ||
      history.context.contextVersion !==
        input.conversationHistoryContextVersion
    ) {
      throw providerMismatch("reply-history-context-stale");
    }
    const inlineImages = await measureTicketReadPhase(
      "provider-article-thread-request",
      {
        connectionId: context.connection.id,
        operation: "mutation",
        providerKey: context.connection.providerKey,
      },
      () => loadZammadReplyHistoryInlineImages({
        articles: history.articles,
        context,
        scope: input.conversationHistoryScope,
        sourceArticleId: fresh.article.id,
        ticketId: zammadTicketId(ticketExternalId),
      }),
    );
    conversationHistoryHtml = zammadReplyConversationHistoryHtml({
      articles: history.articles,
      assets: history.assets,
      inlineImages,
      scope: input.conversationHistoryScope,
      sourceArticleId: fresh.article.id,
    });
  }
  const authoredBody = zammadMentionHtml(
    context,
    input.body,
    input.bodyFormat === "html" ? "html" : "plain",
  );
  const outboundBody = zammadOutboundBody({
    body: authoredBody,
    bodyFormat: input.bodyFormat,
    conversationHistoryHtml,
    signature: input.resolvedSignature,
  });

  let response: unknown;
  try {
    response = await measureTicketReadPhase(
      "provider-metadata-mutation-request",
      {
        connectionId: context.connection.id,
        operation: "mutation",
        providerKey: context.connection.providerKey,
      },
      () => zammadSendJson(context, "/api/v1/ticket_articles", "POST", {
        ticket_id: zammadTicketId(ticketExternalId),
        to: recipients.to.join(", "),
        cc: recipients.cc.join(", "),
        subject: fresh.article.subject?.trim() || fresh.ticket.title,
        body: outboundBody.body,
        content_type: outboundBody.contentType,
        type: "email",
        internal: false,
        sender: "Agent",
        ...(fresh.article.message_id
          ? { in_reply_to: fresh.article.message_id }
          : {}),
      }),
    );
  } catch (error) {
    if (error instanceof ProviderError && error.statusCode === 422) {
      rethrowZammadMentionWriteError(error, input.body);
    }
    if (error instanceof ProviderError && error.kind === "temporary-provider-failure") {
      throw new ProviderError(
        error.kind,
        error.message,
        false,
        error.statusCode,
        "delivery-uncertain",
      );
    }
    throw error;
  }
  if (!zammadArticleSchema.safeParse(response).success) {
    throw providerMismatch("delivery-uncertain");
  }
}

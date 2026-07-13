import { z } from "zod";
import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketCustomerReplyInput } from "@/core/ticket-replies";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { participantFromReference, relationId } from "./participants";
import { zammadGetJson, zammadSendJson, zammadBaseUrl } from "./client";
import { mapArticle, mapTicket } from "./mapping";
import { readOptionalZammadReplyPolicy } from "./reply-policy";
import { zammadReplyContext } from "./reply-context";
import {
  zammadArticleSchema,
  zammadFullTicketPayloadSchema,
  zammadTicketSchema,
  zammadUserSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";
import { zammadTicketId } from "./ticket-id";

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

function ticketPayload(payload: unknown): { ticket: ZammadTicket; assets?: ZammadAssets } {
  const full = zammadFullTicketPayloadSchema.safeParse(payload);
  if (full.success) {
    const records = full.data.assets.Ticket;
    const id = full.data.record_ids?.[0];
    const ticket = id === undefined
      ? Object.values(records ?? {})[0]
      : records?.[String(id)];
    if (ticket) {
      return { ticket, assets: full.data.assets };
    }
  }
  const ticket = zammadTicketSchema.safeParse(payload);
  if (!ticket.success) {
    throw providerMismatch();
  }
  return { ticket: ticket.data };
}

async function customerForTicket(
  context: ProviderContext,
  ticket: ZammadTicket,
  assets: ZammadAssets | undefined,
) {
  const customerId = relationId(ticket.customer_id);
  let effectiveAssets = assets;
  if (customerId && !effectiveAssets?.User?.[customerId]) {
    const response = await zammadGetJson(
      context,
      `/api/v1/users/${encodeURIComponent(customerId)}`,
    );
    const user = zammadUserSchema.safeParse(response);
    if (!user.success) {
      throw providerMismatch();
    }
    effectiveAssets = {
      ...effectiveAssets,
      User: { ...effectiveAssets?.User, [customerId]: user.data },
    };
  }
  return participantFromReference({
    assets: effectiveAssets,
    fallback: ticket.customer,
    id: ticket.customer_id,
    role: "customer",
  });
}

function normalizedRecipients(input: TicketCustomerReplyInput) {
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

async function freshReplyContext(
  context: ProviderContext,
  ticketExternalId: string,
  sourceArticleExternalId: string,
) {
  const ticketId = zammadTicketId(ticketExternalId);
  const articleId = zammadTicketId(sourceArticleExternalId);
  const [rawTicket, rawArticle, managedAddresses] = await Promise.all([
    zammadGetJson(
      context,
      `/api/v1/tickets/${encodeURIComponent(String(ticketId))}?expand=true&full=true`,
    ),
    zammadGetJson(
      context,
      `/api/v1/ticket_articles/${encodeURIComponent(String(articleId))}`,
    ),
    readOptionalZammadReplyPolicy(context),
  ]);
  if (!managedAddresses) {
    throw providerMismatch("reply-context-unavailable");
  }
  const payload = ticketPayload(rawTicket);
  const article = zammadArticleSchema.safeParse(rawArticle);
  if (!article.success || article.data.ticket_id !== ticketId) {
    throw providerMismatch("reply-context-unavailable");
  }
  const customer = await customerForTicket(
    context,
    payload.ticket,
    payload.assets,
  );
  const mappedArticle = mapArticle(article.data, payload.assets);
  const replyContext = zammadReplyContext({
    article: article.data,
    customer,
    managedAddresses,
    mappedArticle,
  });
  if (!replyContext) {
    throw providerMismatch("reply-context-unavailable");
  }
  return {
    article: article.data,
    replyContext,
    ticket: mapTicket(payload.ticket, zammadBaseUrl(context), payload.assets),
  };
}

export async function addZammadTicketCustomerReply(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketCustomerReplyInput,
): Promise<void> {
  if (!input.body.trim()) {
    throw new ProviderError("validation-failure", "Customer reply body is required.");
  }
  const recipients = normalizedRecipients(input);
  const fresh = await measureTicketReadPhase(
    "provider-metadata-mutation-current-ticket-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () => freshReplyContext(
      context,
      ticketExternalId,
      input.sourceArticleExternalId,
    ),
  );
  if (fresh.replyContext.contextVersion !== input.contextVersion) {
    throw providerMismatch("reply-context-stale");
  }
  if (!fresh.replyContext.availableIntents.includes(input.intent)) {
    throw providerMismatch("unsupported-reply-intent");
  }

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
        body: input.body.trim(),
        content_type: input.bodyFormat === "html" ? "text/html" : "text/plain",
        type: "email",
        internal: false,
        sender: "Agent",
        ...(fresh.article.message_id
          ? { in_reply_to: fresh.article.message_id }
          : {}),
      }),
    );
  } catch (error) {
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

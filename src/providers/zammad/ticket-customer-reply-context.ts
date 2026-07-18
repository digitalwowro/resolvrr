import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  TicketConversationHistoryScope,
} from "@/core/ticket-conversation-history";
import { participantFromReference, relationId } from "./participants";
import { zammadBaseUrl, zammadGetJson } from "./client";
import { mapArticle, mapTicket } from "./mapping";
import { readOptionalZammadReplyPolicy } from "./reply-policy";
import { zammadReplyContext } from "./reply-context";
import {
  zammadArticleListResponseSchema,
  zammadArticleSchema,
  zammadUserSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";
import { zammadArticlePayloadRecords } from "./ticket-detail-payload";
import { zammadTicketId } from "./ticket-id";
import {
  assertZammadTicketNotMerged,
  zammadTicketPayload,
} from "./ticket-mutation-preflight";
import {
  zammadReplyConversationHistoryContext,
} from "./reply-conversation-history";

function providerMismatch(code?: string): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
    false,
    undefined,
    code,
  );
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
    if (!user.success) throw providerMismatch();
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

export async function freshZammadReplyContext(
  context: ProviderContext,
  ticketExternalId: string,
  sourceArticleExternalId: string,
  includeConversationHistory: boolean,
  conversationHistoryScope?: TicketConversationHistoryScope,
) {
  const ticketId = zammadTicketId(ticketExternalId);
  const articleId = zammadTicketId(sourceArticleExternalId);
  const [rawTicket, rawArticle, managedAddresses, rawHistory] = await Promise.all([
    zammadGetJson(
      context,
      `/api/v1/tickets/${encodeURIComponent(String(ticketId))}?expand=true&full=true`,
    ),
    zammadGetJson(
      context,
      `/api/v1/ticket_articles/${encodeURIComponent(String(articleId))}`,
    ),
    readOptionalZammadReplyPolicy(context),
    includeConversationHistory
      ? zammadGetJson(
          context,
          `/api/v1/ticket_articles/by_ticket/${encodeURIComponent(String(ticketId))}?expand=true&full=true`,
        )
      : Promise.resolve(undefined),
  ]);
  if (!managedAddresses) throw providerMismatch("reply-context-unavailable");
  const payload = zammadTicketPayload(rawTicket);
  assertZammadTicketNotMerged(payload);
  const article = zammadArticleSchema.safeParse(rawArticle);
  if (!article.success || article.data.ticket_id !== ticketId) {
    throw providerMismatch("reply-context-unavailable");
  }
  const customer = await customerForTicket(
    context,
    payload.ticket,
    payload.assets,
  );
  const replyContext = zammadReplyContext({
    article: article.data,
    customer,
    managedAddresses,
    mappedArticle: mapArticle(article.data, payload.assets),
  });
  if (!replyContext) throw providerMismatch("reply-context-unavailable");
  let history;
  if (includeConversationHistory) {
    if (!zammadArticleListResponseSchema.safeParse(rawHistory).success) {
      throw providerMismatch("reply-history-unavailable");
    }
    const historyPayload = zammadArticlePayloadRecords(rawHistory);
    const historyContext = zammadReplyConversationHistoryContext(
      historyPayload.articles,
      conversationHistoryScope ?? "through-source",
      articleId,
    );
    if (!historyContext) throw providerMismatch("reply-history-unavailable");
    history = {
      articles: historyPayload.articles,
      assets: {
        ...payload.assets,
        ...historyPayload.assets,
        User: {
          ...payload.assets?.User,
          ...historyPayload.assets?.User,
        },
      },
      context: historyContext,
    };
  }
  return {
    article: article.data,
    history,
    replyContext,
    ticket: mapTicket(payload.ticket, zammadBaseUrl(context), payload.assets),
  };
}

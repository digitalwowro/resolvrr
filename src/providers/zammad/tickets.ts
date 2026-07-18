import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketDetailProviderResult } from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { mapArticle, mapTicket } from "./mapping";
import {
  missingZammadOrganizationIds,
  readOptionalZammadOrganizationAssets,
} from "./organization-assets";
import {
  zammadArticleListResponseSchema,
  zammadTicketSchema,
} from "./schemas";
import { zammadBaseUrl, zammadGetJson } from "./client";
import { readZammadSecondaryTicketData } from "./ticket-secondary";
import { readOptionalZammadReplyPolicy } from "./reply-policy";
import { zammadReplyContext } from "./reply-context";
import { zammadForwardContext } from "./forward-context";
import {
  zammadReplyConversationHistoryContext,
} from "./reply-conversation-history";
import { resolveZammadMergedTicket } from "./ticket-merge-resolution";
import { isZammadMergedTicket } from "./ticket-state";
import {
  fetchZammadDetailUsers,
  mergeZammadDetailAssets,
  missingZammadDetailUserIds,
  zammadArticlePayloadRecords,
  zammadDetailUserIds,
  zammadTicketPayloadRecords,
} from "./ticket-detail-payload";
export { listZammadTickets } from "./ticket-list";

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    providerKey: context.connection.providerKey,
  };
}


export async function getZammadTicketDetail(
  context: ProviderContext,
  ticketExternalId: string,
): Promise<TicketDetailProviderResult> {
  const ticketId = encodeURIComponent(ticketExternalId);
  const metadata = timingMetadata(context);
  const [rawTicket, rawArticles] = await Promise.all([
    measureTicketReadPhase(
      "provider-detail-metadata-request",
      { ...metadata, operation: "detail" },
      () =>
        zammadGetJson(
          context,
          `/api/v1/tickets/${ticketId}?expand=true&full=true`,
        ),
    ),
    measureTicketReadPhase(
      "provider-article-thread-request",
      { ...metadata, operation: "detail" },
      () =>
        zammadGetJson(
          context,
          `/api/v1/ticket_articles/by_ticket/${ticketId}?expand=true&full=true`,
        ),
    ),
  ]);

  return measureTicketReadPhase(
    "provider-mapping-parsing",
    { ...metadata, operation: "detail" },
    async () => {
      const parsedTicketPayload = zammadTicketPayloadRecords(rawTicket);
      const rawTicketPayload = parsedTicketPayload.tickets.length
        ? parsedTicketPayload
        : { tickets: [rawTicket], assets: undefined };
      const rawArticlePayload = zammadArticlePayloadRecords(rawArticles);
      const ticket = zammadTicketSchema.safeParse(rawTicketPayload.tickets[0]);
      const articles = zammadArticleListResponseSchema.safeParse(rawArticles);
      if (!ticket.success || !articles.success) {
        throw providerDataMismatch();
      }
      const existingAssets = {
        ...rawTicketPayload.assets,
        ...rawArticlePayload.assets,
        User: {
          ...rawTicketPayload.assets?.User,
          ...rawArticlePayload.assets?.User,
        },
      };
      if (isZammadMergedTicket(ticket.data, existingAssets)) {
        return resolveZammadMergedTicket(
          context,
          ticketExternalId,
          ticket.data.number,
        );
      }
      const [users, secondary] = await Promise.all([
        fetchZammadDetailUsers(
          context,
          missingZammadDetailUserIds(
            existingAssets,
            zammadDetailUserIds(ticket.data, rawArticlePayload.articles),
          ),
        ),
        readZammadSecondaryTicketData(context, ticket.data, existingAssets),
      ]);
      const assetsWithSecondary = mergeZammadDetailAssets(
        existingAssets,
        users,
        secondary.assets,
      );
      const organizationAssets = await readOptionalZammadOrganizationAssets(
        context,
        missingZammadOrganizationIds({
          assets: assetsWithSecondary,
          tickets: [ticket.data],
        }),
        "detail",
      );
      const assets = mergeZammadDetailAssets(
        existingAssets,
        users,
        secondary.assets,
        organizationAssets,
      );
      const managedAddresses = await readOptionalZammadReplyPolicy(context);
      const mappedTicket = {
        ...mapTicket(ticket.data, zammadBaseUrl(context), assets),
        tags: secondary.tags,
      };
      const mappedArticles = rawArticlePayload.articles.map((article) => {
        const mappedArticle = mapArticle(article, assets, {
          helpdeskConnectionId: context.connection.id,
        });
        const conversationHistory = zammadReplyConversationHistoryContext(
          rawArticlePayload.articles,
          "through-source",
          article.id,
        );
        const rawForwardContext = zammadForwardContext(
          article,
          mappedTicket.title,
        );
        const forwardContext = rawForwardContext
          ? {
              ...rawForwardContext,
              ...(conversationHistory ? { conversationHistory } : {}),
            }
          : undefined;
        const rawReplyContext = managedAddresses
          ? zammadReplyContext({
              article,
              customer: mappedTicket.customer,
              managedAddresses,
              mappedArticle,
            })
          : undefined;
        const replyContext = rawReplyContext
          ? {
              ...rawReplyContext,
              ...(conversationHistory ? { conversationHistory } : {}),
            }
          : undefined;
        return {
          ...mappedArticle,
          ...(forwardContext ? { forwardContext } : {}),
          ...(replyContext ? { replyContext } : {}),
        };
      });
      const conversationHistory = zammadReplyConversationHistoryContext(
        rawArticlePayload.articles,
        "current",
      );

      return {
        ticket: mappedTicket,
        thread: {
          ticketExternalId,
          articles: mappedArticles,
        },
        links: secondary.links,
        subscription: secondary.subscription,
        measuredAt: new Date(),
        ...(managedAddresses || conversationHistory
          ? {
              replyPolicy: {
                ...(conversationHistory ? { conversationHistory } : {}),
                providerManagedAddresses: managedAddresses ?? [],
              },
            }
          : {}),
      };
    },
  );
}

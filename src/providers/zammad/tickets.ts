import { ProviderError, type TicketListQuery } from "@/core/providers";
import type { ProviderContext } from "@/core/providers";
import type { TicketDetail } from "@/core/tickets";
import { mapArticle, mapTicket, mapTicketListItem } from "./mapping";
import {
  zammadArticleListSchema,
  zammadTicketListSchema,
  zammadTicketSchema,
} from "./schemas";
import { zammadBaseUrl, zammadGetJson } from "./client";

function pageFromCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 1;
  }

  const page = Number(cursor);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

export async function listZammadTickets(
  context: ProviderContext,
  query: TicketListQuery,
) {
  const page = pageFromCursor(query.cursor);
  const limit = Math.min(Math.max(query.limit, 1), 50);
  const params = new URLSearchParams({
    page: String(page),
    per_page: String(limit),
    expand: "true",
  });
  const raw = await zammadGetJson(context, `/api/v1/tickets?${params}`);
  const parsed = zammadTicketListSchema.safeParse(raw);
  if (!parsed.success) {
    throw providerDataMismatch();
  }

  return {
    tickets: parsed.data.map((ticket) =>
      mapTicketListItem(ticket, zammadBaseUrl(context)),
    ),
    nextCursor: parsed.data.length === limit ? String(page + 1) : undefined,
    measuredAt: new Date(),
  };
}

export async function getZammadTicketDetail(
  context: ProviderContext,
  ticketExternalId: string,
): Promise<TicketDetail> {
  const ticketId = encodeURIComponent(ticketExternalId);
  const [rawTicket, rawArticles] = await Promise.all([
    zammadGetJson(context, `/api/v1/tickets/${ticketId}?expand=true`),
    zammadGetJson(
      context,
      `/api/v1/ticket_articles/by_ticket/${ticketId}?expand=true`,
    ),
  ]);
  const ticket = zammadTicketSchema.safeParse(rawTicket);
  const articles = zammadArticleListSchema.safeParse(rawArticles);
  if (!ticket.success || !articles.success) {
    throw providerDataMismatch();
  }

  return {
    ticket: mapTicket(ticket.data, zammadBaseUrl(context)),
    thread: {
      ticketExternalId,
      articles: articles.data.map(mapArticle),
    },
    links: [],
    subscription: { supported: false, following: false },
    measuredAt: new Date(),
  };
}

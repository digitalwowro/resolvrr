import {
  ProviderError,
  type ProviderContext,
  type TicketListQuery,
} from "@/core/providers";
import { zammadBaseUrl } from "./client";
import { mapTicketListItem } from "./mapping";
import {
  zammadFullTicketPayloadSchema,
  zammadTicketListResponseSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";
import { resolveZammadTicketListAssets } from "./ticket-list-assets";
import { isZammadMergedTicket } from "./ticket-state";

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function isFullPayload(
  payload: unknown,
): payload is { assets: ZammadAssets; record_ids?: Array<string | number>; total_count?: number } {
  return zammadFullTicketPayloadSchema.safeParse(payload).success;
}

function orderedAssetRecords<T>(
  records: Record<string, T> | undefined,
  recordIds: Array<string | number> | undefined,
): T[] {
  if (!records) {
    return [];
  }
  if (recordIds && recordIds.length > 0) {
    return recordIds
      .map((id) => records[String(id)])
      .filter((record): record is T => Boolean(record));
  }

  return Object.values(records);
}

function ticketPayloadRecords(payload: unknown): {
  assets?: ZammadAssets;
  tickets: ZammadTicket[];
  totalCount?: number;
} {
  if (Array.isArray(payload)) {
    return { tickets: payload };
  }
  if (isFullPayload(payload)) {
    return {
      assets: payload.assets,
      tickets: orderedAssetRecords(payload.assets.Ticket, payload.record_ids),
      totalCount: payload.total_count,
    };
  }

  return { tickets: [] };
}

function nextTicketListCursor(
  page: number,
  limit: number,
  loadedCount: number,
  totalCount: number | undefined,
) {
  if (totalCount !== undefined) {
    return page * limit < totalCount ? String(page + 1) : undefined;
  }

  return loadedCount === limit ? String(page + 1) : undefined;
}

export async function mapZammadTicketListPayload(
  context: ProviderContext,
  query: TicketListQuery,
  raw: unknown,
  page: number,
  limit: number,
) {
  const parsed = zammadTicketListResponseSchema.safeParse(raw);
  if (!parsed.success) {
    throw providerDataMismatch();
  }
  const payload = ticketPayloadRecords(parsed.data);
  if (query.count?.includeTotal && payload.totalCount === undefined) {
    throw providerDataMismatch();
  }
  const visibleTickets = payload.tickets.filter(
    (ticket) => !isZammadMergedTicket(ticket, payload.assets),
  );
  const assets = await resolveZammadTicketListAssets(
    context,
    payload.assets,
    visibleTickets,
  );
  const totalCount = query.count?.includeTotal ? payload.totalCount : undefined;

  return {
    tickets: visibleTickets.map((ticket) =>
      mapTicketListItem(ticket, zammadBaseUrl(context), assets),
    ),
    loadedCount: visibleTickets.length,
    totalCount,
    nextCursor: nextTicketListCursor(
      page,
      limit,
      visibleTickets.length,
      totalCount,
    ),
    measuredAt: new Date(),
  };
}

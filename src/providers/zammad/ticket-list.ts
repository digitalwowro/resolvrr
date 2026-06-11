import type { ProviderContext, TicketListQuery } from "@/core/providers";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadGetJson } from "./client";
import { listZammadGroupedTickets } from "./ticket-groups";
import {
  fetchZammadNamedAssets,
  mapZammadTicketListPayload,
} from "./ticket-list-payload";
import { zammadTicketListPath } from "./ticket-search-query";

function pageFromCursor(cursor: string | undefined): number {
  if (!cursor) {
    return 1;
  }

  const page = Number(cursor);
  return Number.isInteger(page) && page > 0 ? page : 1;
}

function timingMetadata(context: ProviderContext) {
  return {
    connectionId: context.connection.id,
    providerKey: context.connection.providerKey,
  };
}

async function readZammadTicketListPage(
  context: ProviderContext,
  query: TicketListQuery,
  page: number,
  limit: number,
  searchQuery?: string,
) {
  const metadata = timingMetadata(context);
  const path = zammadTicketListPath(query, page, limit, searchQuery);
  const raw = await measureTicketReadPhase(
    "provider-list-request",
    { ...metadata, operation: "list" },
    () => zammadGetJson(context, path),
  );

  return measureTicketReadPhase(
    "provider-mapping-parsing",
    { ...metadata, operation: "list" },
    () => mapZammadTicketListPayload(context, query, raw, page, limit),
  );
}

export async function listZammadTickets(
  context: ProviderContext,
  query: TicketListQuery,
) {
  const page = pageFromCursor(query.cursor);
  const limit = Math.min(Math.max(query.pageSize, 1), 50);

  if (query.group) {
    return listZammadGroupedTickets(context, query, page, limit, {
      fetchNamedAssets: (nextContext, path) =>
        fetchZammadNamedAssets(nextContext, path),
      readTicketListPage: readZammadTicketListPage,
    });
  }

  return readZammadTicketListPage(context, query, page, limit);
}

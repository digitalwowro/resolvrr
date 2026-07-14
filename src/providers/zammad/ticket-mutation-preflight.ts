import { ProviderError, type ProviderContext } from "@/core/providers";
import { zammadGetJson } from "./client";
import {
  zammadFullTicketPayloadSchema,
  zammadTicketSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";
import { zammadTicketId } from "./ticket-id";
import { isZammadMergedTicket } from "./ticket-state";

export type ZammadTicketPayload = {
  assets?: ZammadAssets;
  ticket: ZammadTicket;
};

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

export function zammadTicketPayload(raw: unknown): ZammadTicketPayload {
  const full = zammadFullTicketPayloadSchema.safeParse(raw);
  if (full.success) {
    const firstId = full.data.record_ids?.[0];
    const ticket = firstId === undefined
      ? Object.values(full.data.assets.Ticket ?? {})[0]
      : full.data.assets.Ticket?.[String(firstId)];
    if (ticket) {
      return { assets: full.data.assets, ticket };
    }
  }

  const ticket = zammadTicketSchema.safeParse(raw);
  if (!ticket.success) {
    throw providerDataMismatch();
  }
  return { ticket: ticket.data };
}

export function assertZammadTicketNotMerged(
  payload: ZammadTicketPayload,
): void {
  if (!isZammadMergedTicket(payload.ticket, payload.assets)) {
    return;
  }
  throw new ProviderError(
    "validation-failure",
    "This ticket has been merged and can no longer be updated.",
    false,
    undefined,
    "ticket-merged",
  );
}

export async function readZammadTicketForMutation(
  context: ProviderContext,
  ticketExternalId: string,
): Promise<ZammadTicketPayload> {
  const ticketId = zammadTicketId(ticketExternalId);
  const raw = await zammadGetJson(
    context,
    `/api/v1/tickets/${encodeURIComponent(String(ticketId))}?expand=true&full=true`,
  );
  const payload = zammadTicketPayload(raw);
  assertZammadTicketNotMerged(payload);
  return payload;
}

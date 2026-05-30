import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
} from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { participantFromReference, relationId } from "./participants";
import { zammadGetJson, zammadSendJson } from "./client";
import {
  zammadArticleSchema,
  zammadFullTicketPayloadSchema,
  zammadTicketSchema,
  zammadUserSchema,
  type ZammadAssets,
  type ZammadTicket,
} from "./schemas";

function zammadTicketId(value: string): number {
  const normalized = value.trim();
  if (!/^\d+$/u.test(normalized)) {
    throw new ProviderError(
      "validation-failure",
      "Invalid ticket reference for the helpdesk provider.",
    );
  }

  const id = Number(normalized);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ProviderError(
      "validation-failure",
      "Invalid ticket reference for the helpdesk provider.",
    );
  }

  return id;
}

function internalNotePayload(ticketExternalId: string, input: TicketInternalNoteInput) {
  return {
    ticket_id: zammadTicketId(ticketExternalId),
    subject: "Internal note",
    body: input.body.trim(),
    content_type: "text/plain",
    type: "note",
    internal: true,
    sender: "Agent",
  };
}

function providerDataMismatch(): ProviderError {
  return new ProviderError(
    "provider-data-mismatch",
    "The helpdesk provider returned an unexpected response.",
  );
}

function orderedTicketRecord(
  records: Record<string, ZammadTicket> | undefined,
  recordIds: Array<string | number> | undefined,
): ZammadTicket | undefined {
  if (!records) {
    return undefined;
  }
  if (recordIds && recordIds.length > 0) {
    return records[String(recordIds[0])];
  }

  return Object.values(records)[0];
}

function ticketPayload(payload: unknown): {
  assets?: ZammadAssets;
  ticket?: ZammadTicket;
} {
  const fullPayload = zammadFullTicketPayloadSchema.safeParse(payload);
  if (fullPayload.success) {
    return {
      assets: fullPayload.data.assets,
      ticket: orderedTicketRecord(
        fullPayload.data.assets.Ticket,
        fullPayload.data.record_ids,
      ),
    };
  }

  const ticket = zammadTicketSchema.safeParse(payload);
  return ticket.success ? { ticket: ticket.data } : {};
}

function safeRecipientAddress(input: {
  email: string | undefined;
  name: string | undefined;
}): string | undefined {
  const email = input.email?.trim();
  if (!email || !/^[^\s@]+@[^\s@]+$/u.test(email)) {
    return undefined;
  }

  const name = input.name?.trim();
  if (!name || name === email || /[<>\r\n]/u.test(name)) {
    return email;
  }

  return `${name.replace(/"/gu, "'")} <${email}>`;
}

async function customerReplyRecipient(
  context: ProviderContext,
  ticketId: number,
): Promise<string> {
  const rawTicket = await zammadGetJson(
    context,
    `/api/v1/tickets/${encodeURIComponent(String(ticketId))}?expand=true&full=true`,
  );
  const payload = ticketPayload(rawTicket);
  const ticket = payload.ticket ? zammadTicketSchema.safeParse(payload.ticket) : undefined;
  if (!ticket?.success) {
    throw providerDataMismatch();
  }

  const customerId = relationId(ticket.data.customer_id);
  let assets = payload.assets;
  if (customerId && !assets?.User?.[customerId]) {
    const rawUser = await zammadGetJson(
      context,
      `/api/v1/users/${encodeURIComponent(customerId)}`,
    );
    const user = zammadUserSchema.safeParse(rawUser);
    if (!user.success) {
      throw providerDataMismatch();
    }
    assets = { ...assets, User: { ...assets?.User, [customerId]: user.data } };
  }

  const customer = participantFromReference({
    assets,
    fallback: ticket.data.customer,
    id: ticket.data.customer_id,
    role: "customer",
  });
  const address = safeRecipientAddress({
    email: customer?.email,
    name: customer?.name,
  });
  if (!address) {
    throw providerDataMismatch();
  }

  return address;
}

function customerReplyPayload(
  ticketExternalId: string,
  input: TicketCustomerReplyInput,
  to: string,
) {
  return {
    ticket_id: zammadTicketId(ticketExternalId),
    to,
    subject: "Customer reply",
    body: input.body.trim(),
    content_type: "text/plain",
    type: "email",
    internal: false,
    sender: "Agent",
  };
}

export async function addZammadTicketInternalNote(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketInternalNoteInput,
): Promise<void> {
  if (!input.body.trim()) {
    throw new ProviderError(
      "validation-failure",
      "Internal note body is required.",
    );
  }

  const response = await measureTicketReadPhase(
    "provider-metadata-mutation-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () =>
      zammadSendJson(
        context,
        "/api/v1/ticket_articles",
        "POST",
        internalNotePayload(ticketExternalId, input),
      ),
  );

  const article = zammadArticleSchema.safeParse(response);
  if (!article.success) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk provider returned an unexpected response.",
    );
  }
}

export async function addZammadTicketCustomerReply(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketCustomerReplyInput,
): Promise<void> {
  if (!input.body.trim()) {
    throw new ProviderError(
      "validation-failure",
      "Customer reply body is required.",
    );
  }
  const ticketId = zammadTicketId(ticketExternalId);

  const to = await measureTicketReadPhase(
    "provider-metadata-mutation-current-ticket-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () => customerReplyRecipient(context, ticketId),
  );
  const response = await measureTicketReadPhase(
    "provider-metadata-mutation-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () =>
      zammadSendJson(
        context,
        "/api/v1/ticket_articles",
        "POST",
        customerReplyPayload(String(ticketId), input, to),
      ),
  );

  const article = zammadArticleSchema.safeParse(response);
  if (!article.success) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk provider returned an unexpected response.",
    );
  }
}

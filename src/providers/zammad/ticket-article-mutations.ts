import { ProviderError, type ProviderContext } from "@/core/providers";
import type {
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
} from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadSendJson } from "./client";
import { zammadArticleSchema } from "./schemas";

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

function customerReplyPayload(
  ticketExternalId: string,
  input: TicketCustomerReplyInput,
) {
  return {
    ticket_id: zammadTicketId(ticketExternalId),
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
        customerReplyPayload(ticketExternalId, input),
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

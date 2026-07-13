import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketInternalNoteInput } from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadSendJson } from "./client";
import { zammadArticleSchema } from "./schemas";
import { zammadTicketId } from "./ticket-id";

export async function addZammadTicketInternalNote(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketInternalNoteInput,
): Promise<void> {
  if (!input.body.trim()) {
    throw new ProviderError("validation-failure", "Internal note body is required.");
  }

  const response = await measureTicketReadPhase(
    "provider-metadata-mutation-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () =>
      zammadSendJson(context, "/api/v1/ticket_articles", "POST", {
        ticket_id: zammadTicketId(ticketExternalId),
        subject: "Internal note",
        body: input.body.trim(),
        content_type: input.bodyFormat === "html" ? "text/html" : "text/plain",
        type: "note",
        internal: true,
        sender: "Agent",
      }),
  );

  if (!zammadArticleSchema.safeParse(response).success) {
    throw new ProviderError(
      "provider-data-mismatch",
      "The helpdesk provider returned an unexpected response.",
    );
  }
}

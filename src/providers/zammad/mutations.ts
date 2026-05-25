import { ProviderError, type ProviderContext } from "@/core/providers";
import type { TicketMetadataMutationInput, TicketPriority, TicketState } from "@/core/tickets";
import { measureTicketReadPhase } from "@/telemetry/ticket-read-timing";
import { zammadSendJson } from "./client";

const zammadStateByCanonical: Record<TicketState, string> = {
  new: "new",
  open: "open",
  pending_reminder: "pending reminder",
  pending_close: "pending close",
  closed: "closed",
};

const zammadPriorityByCanonical: Record<TicketPriority, string> = {
  low: "1 low",
  medium: "2 normal",
  high: "3 high",
};

function mutationPayload(input: TicketMetadataMutationInput) {
  return {
    ...(input.state ? { state: zammadStateByCanonical[input.state] } : {}),
    ...(input.priority ? { priority: zammadPriorityByCanonical[input.priority] } : {}),
  };
}

export async function updateZammadTicketMetadata(
  context: ProviderContext,
  ticketExternalId: string,
  input: TicketMetadataMutationInput,
): Promise<void> {
  const payload = mutationPayload(input);
  if (Object.keys(payload).length === 0) {
    throw new ProviderError(
      "validation-failure",
      "No supported ticket metadata changes were provided.",
    );
  }

  await measureTicketReadPhase(
    "provider-metadata-mutation-request",
    {
      connectionId: context.connection.id,
      operation: "mutation",
      providerKey: context.connection.providerKey,
    },
    () =>
      zammadSendJson(
        context,
        `/api/v1/tickets/${encodeURIComponent(ticketExternalId)}`,
        "PUT",
        payload,
      ),
  );
}

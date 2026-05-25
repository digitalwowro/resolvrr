import type { TicketExternalId, TicketMetadataMutationInput } from "@/core/tickets";
import type { TicketListQuery } from "@/core/providers";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import {
  hasTicketMetadataMutationInput,
  ticketMetadataMutationCapabilities,
} from "./mutation-model";
import {
  unavailableTicketRead,
  type TicketDetailReadResult,
  type TicketListReadResult,
} from "./read-model";

function hasCapability(
  providerContext: TicketProviderContext,
  capability:
    | "ticket:list"
    | "ticket:detail"
    | "ticket:update-state"
    | "ticket:update-priority",
): boolean {
  return providerContext.plugin.capabilities.includes(capability);
}

function canUpdateTicketMetadata(
  providerContext: TicketProviderContext,
  input: TicketMetadataMutationInput,
): boolean {
  return (
    (!input.state || hasCapability(providerContext, "ticket:update-state")) &&
    (!input.priority || hasCapability(providerContext, "ticket:update-priority"))
  );
}

export async function dispatchTicketListRead(
  providerContext: TicketProviderContext,
  query: TicketListQuery,
): Promise<TicketListReadResult> {
  if (!hasCapability(providerContext, "ticket:list")) {
    return unavailableTicketRead("unsupported-capability");
  }
  if (!providerContext.plugin.listTickets) {
    return unavailableTicketRead("unsupported-capability");
  }

  try {
    const result = await providerContext.plugin.listTickets(
      providerContext.context,
      query,
    );

    return {
      status: "available",
      connectionName: providerContext.context.connection.displayName,
      metadataMutationCapabilities: ticketMetadataMutationCapabilities(
        providerContext.plugin.capabilities,
      ),
      tickets: result.tickets,
      nextCursor: result.nextCursor,
      measuredAt: result.measuredAt,
    };
  } catch (error) {
    return readUnavailableForProviderError(error);
  }
}

export async function dispatchTicketDetailRead(
  providerContext: TicketProviderContext,
  ticketExternalId: TicketExternalId,
): Promise<TicketDetailReadResult> {
  if (!hasCapability(providerContext, "ticket:detail")) {
    return unavailableTicketRead("unsupported-capability");
  }
  if (!providerContext.plugin.getTicketDetail) {
    return unavailableTicketRead("unsupported-capability");
  }

  try {
    return {
      status: "available",
      detail: await providerContext.plugin.getTicketDetail(
        providerContext.context,
        ticketExternalId,
      ),
    };
  } catch (error) {
    return readUnavailableForProviderError(error);
  }
}

export async function dispatchTicketMetadataMutation(
  providerContext: TicketProviderContext,
  ticketExternalId: TicketExternalId,
  input: TicketMetadataMutationInput,
) {
  if (!hasTicketMetadataMutationInput(input)) {
    return unavailableTicketRead("unsupported-capability");
  }
  if (!canUpdateTicketMetadata(providerContext, input)) {
    return unavailableTicketRead("unsupported-capability");
  }
  if (!providerContext.plugin.updateTicketMetadata) {
    return unavailableTicketRead("unsupported-capability");
  }

  try {
    await providerContext.plugin.updateTicketMetadata(
      providerContext.context,
      ticketExternalId,
      input,
    );
    return { status: "saved" as const };
  } catch (error) {
    return readUnavailableForProviderError(error);
  }
}

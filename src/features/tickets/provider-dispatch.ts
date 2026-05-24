import type { TicketExternalId } from "@/core/tickets";
import type { TicketListQuery } from "@/core/providers";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import {
  unavailableTicketRead,
  type TicketDetailReadResult,
  type TicketListReadResult,
} from "./read-model";

function hasCapability(
  providerContext: TicketProviderContext,
  capability: "ticket:list" | "ticket:detail",
): boolean {
  return providerContext.plugin.capabilities.includes(capability);
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

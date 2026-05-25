import { ProviderError, type TicketListQuery } from "@/core/providers";
import type { TicketExternalId, TicketMetadataMutationInput } from "@/core/tickets";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import {
  hasTicketMetadataMutationInput,
  invalidTicketMetadataMutationInput,
  ticketMetadataMutationCapabilities,
  type TicketMetadataMutationResult,
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
): Promise<TicketMetadataMutationResult> {
  if (!hasTicketMetadataMutationInput(input)) {
    return {
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    };
  }
  if (invalidTicketMetadataMutationInput(input)) {
    return {
      status: "failed",
      reason: "invalid-input",
      retryable: false,
    };
  }
  if (!canUpdateTicketMetadata(providerContext, input)) {
    return {
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    };
  }
  if (!providerContext.plugin.updateTicketMetadata) {
    return {
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    };
  }

  try {
    await providerContext.plugin.updateTicketMetadata(
      providerContext.context,
      ticketExternalId,
      input,
    );
    return { status: "saved" as const };
  } catch (error) {
    if (error instanceof ProviderError && error.kind === "validation-failure") {
      return {
        status: "failed",
        reason: "unavailable-transition",
        retryable: false,
      };
    }

    const unavailable = readUnavailableForProviderError(error);
    return {
      status: "failed",
      reason: unavailable.reason,
      retryable: unavailable.retryable,
    };
  }
}

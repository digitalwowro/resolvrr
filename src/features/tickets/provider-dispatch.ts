import {
  ProviderError,
  type ProviderCapability,
  type TicketListQuery,
} from "@/core/providers";
import {
  availableTicketLookupList,
  unavailableTicketLookupList,
  unsupportedTicketLookupData,
  unsupportedTicketLookupList,
  type TicketLookupData,
  type TicketLookupList,
  type TicketLookupUnavailableReason,
} from "@/core/ticket-lookups";
import type { TicketExternalId, TicketMetadataMutationInput } from "@/core/tickets";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import { ticketListQueryCapabilities } from "./list-query-guardrails";
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
  capability: ProviderCapability,
): boolean {
  return providerContext.plugin.capabilities.includes(capability);
}

function lookupReasonForProviderError(
  error: unknown,
): { reason: TicketLookupUnavailableReason; retryable: boolean } {
  const unavailable = readUnavailableForProviderError(error);
  if (unavailable.reason === "provider-auth-failed") {
    return { reason: "provider-auth-failed", retryable: unavailable.retryable };
  }
  if (unavailable.reason === "provider-permission-denied") {
    return {
      reason: "provider-permission-denied",
      retryable: unavailable.retryable,
    };
  }
  if (unavailable.reason === "provider-rate-limited") {
    return { reason: "provider-rate-limited", retryable: unavailable.retryable };
  }
  if (unavailable.reason === "provider-temporary-failure") {
    return {
      reason: "provider-temporary-failure",
      retryable: unavailable.retryable,
    };
  }
  if (unavailable.reason === "unsupported-capability") {
    return { reason: "unsupported-capability", retryable: unavailable.retryable };
  }

  return {
    reason: "provider-unexpected-response",
    retryable: unavailable.retryable,
  };
}

async function dispatchLookupListRead({
  read,
}: {
  read?: () => Promise<{ externalId: string; label: string }[]>;
}): Promise<TicketLookupList> {
  if (!read) {
    return unsupportedTicketLookupList();
  }

  try {
    return availableTicketLookupList(await read());
  } catch (error) {
    const unavailable = lookupReasonForProviderError(error);
    return unavailableTicketLookupList(
      unavailable.reason,
      unavailable.retryable,
    );
  }
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
      queryCapabilities: ticketListQueryCapabilities(
        providerContext.plugin.capabilities,
      ),
      tickets: result.tickets,
      loadedCount: result.loadedCount,
      totalCount: result.totalCount,
      nextCursor: result.nextCursor,
      buckets: result.buckets,
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

export async function dispatchTicketLookupDataRead(
  providerContext: TicketProviderContext,
): Promise<TicketLookupData> {
  const canListAssignableUsers = hasCapability(
    providerContext,
    "lookup:assignable-users",
  );
  const canListGroups = hasCapability(providerContext, "lookup:groups");
  if (!canListAssignableUsers && !canListGroups) {
    return unsupportedTicketLookupData();
  }

  const [assignableUsers, groups] = await Promise.all([
    dispatchLookupListRead({
      read: canListAssignableUsers && providerContext.plugin.listAssignableUsers
        ? () => providerContext.plugin.listAssignableUsers!(
            providerContext.context,
          )
        : undefined,
    }),
    dispatchLookupListRead({
      read: canListGroups && providerContext.plugin.listGroups
        ? () => providerContext.plugin.listGroups!(providerContext.context)
        : undefined,
    }),
  ]);

  return { assignableUsers, groups };
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

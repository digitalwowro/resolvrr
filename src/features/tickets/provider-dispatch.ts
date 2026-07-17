import {
  ProviderError,
  type ProviderCapability,
  type TicketListQuery,
} from "@/core/providers";
import type {
  TicketExternalId,
  TicketLinkTarget,
  TicketLinkTargetSearchInput,
  TicketMetadataMutationInput,
} from "@/core/tickets";
import type { TicketProviderContext } from "./connection-context";
import { readUnavailableForProviderError } from "./connection-context";
import { ticketCommunicationCapabilities } from "./communication-model";
import { ticketListQueryCapabilities } from "./list-query-guardrails";
import {
  hasTicketMetadataMutationInput,
  invalidTicketMetadataMutationInput,
  ticketMetadataMutationCapabilities,
  type TicketMetadataMutationResult,
} from "./mutation-model";
import {
  unavailableTicketRead,
  type TicketDetailProviderReadResult,
  type TicketListReadResult,
} from "./read-model";

function hasCapability(
  providerContext: TicketProviderContext,
  capability: ProviderCapability,
): boolean {
  return providerContext.plugin.capabilities.includes(capability);
}

function canUpdateTicketMetadata(
  providerContext: TicketProviderContext,
  input: TicketMetadataMutationInput,
): boolean {
  const relationSupported =
    !input.linkAddRelation ||
    input.linkAddRelation === "related" ||
    hasCapability(providerContext, "ticket:update-link-relations");

  return (
    (!input.ownerExternalId ||
      hasCapability(providerContext, "ticket:update-owner")) &&
    (!input.groupExternalId ||
      hasCapability(providerContext, "ticket:update-group")) &&
    (!Object.prototype.hasOwnProperty.call(input, "tags") ||
      hasCapability(providerContext, "ticket:update-tags")) &&
    ((!input.linkAddExternalId && !input.linkRemoveExternalIds?.length) ||
      hasCapability(providerContext, "ticket:update-links")) &&
    relationSupported &&
    (!Object.prototype.hasOwnProperty.call(input, "subscriptionFollowing") ||
      hasCapability(providerContext, "ticket:update-subscription")) &&
    (!input.state || hasCapability(providerContext, "ticket:update-state")) &&
    (!input.priority || hasCapability(providerContext, "ticket:update-priority"))
  );
}

export async function dispatchTicketLinkTargetSearch(
  providerContext: TicketProviderContext,
  input: TicketLinkTargetSearchInput,
): Promise<TicketLinkTarget[]> {
  if (!hasCapability(providerContext, "lookup:link-targets")) {
    throw new ProviderError(
      "unsupported-capability",
      "This helpdesk provider cannot search ticket link targets.",
    );
  }
  if (!providerContext.plugin.searchLinkTargets) {
    throw new ProviderError(
      "unsupported-capability",
      "This helpdesk provider cannot search ticket link targets.",
    );
  }

  return providerContext.plugin.searchLinkTargets(providerContext.context, input);
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
      communicationCapabilities: ticketCommunicationCapabilities(
        providerContext.plugin.capabilities,
      ),
      connectionName: providerContext.context.connection.displayName,
      helpdeskConnectionId: providerContext.context.connection.id,
      workspaceId: providerContext.context.connection.workspaceId,
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
): Promise<TicketDetailProviderReadResult> {
  if (!hasCapability(providerContext, "ticket:detail")) {
    return unavailableTicketRead("unsupported-capability");
  }
  if (!providerContext.plugin.getTicketDetail) {
    return unavailableTicketRead("unsupported-capability");
  }

  try {
    const result = await providerContext.plugin.getTicketDetail(
      providerContext.context,
      ticketExternalId,
    );
    if (!("kind" in result)) {
      return { status: "available", detail: result };
    }
    if (result.kind === "replaced") {
      return {
        status: "replaced",
        cause: result.cause,
        sourceExternalId: result.sourceExternalId,
        ...(result.sourceNumber ? { sourceNumber: result.sourceNumber } : {}),
        targetExternalId: result.targetExternalId,
      };
    }
    return {
      status: "retired",
      reason: "merged-target-unavailable",
      retryable: false,
      sourceExternalId: result.sourceExternalId,
      ...(result.sourceNumber ? { sourceNumber: result.sourceNumber } : {}),
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
        reason: error.diagnosticCode === "owner-group-mismatch"
          ? "owner-group-mismatch"
          : "unavailable-transition",
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

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
  const canGetCurrentUser = hasCapability(providerContext, "lookup:current-user");
  const canListGroups = hasCapability(providerContext, "lookup:groups");
  const canListTags = hasCapability(providerContext, "lookup:tags");
  if (!canListAssignableUsers && !canGetCurrentUser && !canListGroups && !canListTags) {
    return unsupportedTicketLookupData();
  }

  const [assignableUsers, currentUser, groups, tags] = await Promise.all([
    dispatchLookupListRead({
      read: canListAssignableUsers && providerContext.plugin.listAssignableUsers
        ? () => providerContext.plugin.listAssignableUsers!(
            providerContext.context,
          )
        : undefined,
    }),
    dispatchLookupListRead({
      read: canGetCurrentUser && providerContext.plugin.getCurrentUser
        ? async () => [await providerContext.plugin.getCurrentUser!(
            providerContext.context,
          )]
        : undefined,
    }),
    dispatchLookupListRead({
      read: canListGroups && providerContext.plugin.listGroups
        ? () => providerContext.plugin.listGroups!(providerContext.context)
        : undefined,
    }),
    dispatchLookupListRead({
      read: canListTags && providerContext.plugin.listTags
        ? () => providerContext.plugin.listTags!(providerContext.context)
        : undefined,
    }),
  ]);

  return { assignableUsers, currentUser, groups, tags };
}

export async function dispatchCurrentHelpdeskUserRead(
  providerContext: TicketProviderContext,
): Promise<TicketLookupList> {
  const canGetCurrentUser = hasCapability(providerContext, "lookup:current-user");
  return dispatchLookupListRead({
    read: canGetCurrentUser && providerContext.plugin.getCurrentUser
      ? async () => [await providerContext.plugin.getCurrentUser!(
          providerContext.context,
        )]
      : undefined,
  });
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

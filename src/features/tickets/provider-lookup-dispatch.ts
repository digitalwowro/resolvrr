import {
  availableTicketLookupList,
  unavailableTicketLookupList,
  unsupportedTicketLookupList,
  type TicketLookupList,
  type TicketLookupUnavailableReason,
} from "@/core/ticket-lookups";
import { readUnavailableForProviderError } from "./connection-context";

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

export async function dispatchLookupListRead({
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

export type TicketLookupOption = {
  externalId: string;
  label: string;
};

export type TicketLookupUnavailableReason =
  | "unsupported-capability"
  | "provider-auth-failed"
  | "provider-permission-denied"
  | "provider-rate-limited"
  | "provider-temporary-failure"
  | "provider-unexpected-response";

export type TicketLookupCachePolicy = "request";

export type TicketLookupList =
  | {
      status: "available";
      cachePolicy: TicketLookupCachePolicy;
      options: TicketLookupOption[];
    }
  | {
      status: "unsupported";
      cachePolicy: TicketLookupCachePolicy;
      options: [];
    }
  | {
      status: "unavailable";
      cachePolicy: TicketLookupCachePolicy;
      options: [];
      reason: TicketLookupUnavailableReason;
      retryable: boolean;
    };

export type TicketLookupData = {
  assignableUsers: TicketLookupList;
  groups: TicketLookupList;
};

export const ticketLookupCachePolicy: TicketLookupCachePolicy = "request";

export function availableTicketLookupList(
  options: TicketLookupOption[],
): TicketLookupList {
  return { status: "available", cachePolicy: ticketLookupCachePolicy, options };
}

export function unsupportedTicketLookupList(): TicketLookupList {
  return { status: "unsupported", cachePolicy: ticketLookupCachePolicy, options: [] };
}

export function unavailableTicketLookupList(
  reason: TicketLookupUnavailableReason,
  retryable = false,
): TicketLookupList {
  return {
    status: "unavailable",
    cachePolicy: ticketLookupCachePolicy,
    options: [],
    reason,
    retryable,
  };
}

export function unsupportedTicketLookupData(): TicketLookupData {
  return {
    assignableUsers: unsupportedTicketLookupList(),
    groups: unsupportedTicketLookupList(),
  };
}

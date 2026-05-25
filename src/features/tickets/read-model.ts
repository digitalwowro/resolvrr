import type { TicketDetail, TicketExternalId, TicketListItem } from "@/core/tickets";
import type { TicketListBucket } from "@/core/providers";
import type { TicketMetadataMutationCapabilities } from "./mutation-model";
export { defaultTicketListQuery } from "@/core/ticket-list-query";

export type TicketReadUnavailableReason =
  | "no-active-connection"
  | "inactive-connection"
  | "missing-credentials"
  | "unknown-provider"
  | "unsupported-capability"
  | "provider-auth-failed"
  | "provider-permission-denied"
  | "provider-rate-limited"
  | "provider-temporary-failure"
  | "provider-unexpected-response"
  | "invalid-connection";

export type TicketReadUnavailable = {
  status: "unavailable";
  reason: TicketReadUnavailableReason;
  retryable: boolean;
};

export type TicketListAvailable = {
  status: "available";
  connectionName: string;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  tickets: TicketListItem[];
  loadedCount: number;
  totalCount?: number;
  nextCursor?: string;
  buckets?: TicketListBucket[];
  measuredAt: Date;
};

export type TicketDetailAvailable = {
  status: "available";
  detail: TicketDetail;
};

export type TicketListReadResult = TicketListAvailable | TicketReadUnavailable;
export type TicketDetailReadResult = TicketDetailAvailable | TicketReadUnavailable;

export function unavailableTicketRead(
  reason: TicketReadUnavailableReason,
  retryable = false,
): TicketReadUnavailable {
  return { status: "unavailable", reason, retryable };
}

export function selectedTicketExternalId(
  value: string | string[] | undefined,
): TicketExternalId | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value || undefined;
}

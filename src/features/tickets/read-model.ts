import type {
  TicketDetail,
  TicketExternalId,
  TicketListItem,
  TicketMergeResolution,
} from "@/core/tickets";
import type {
  TicketListBucket,
  TicketListQueryCapabilities,
  TicketListQueryRejection,
} from "@/core/providers";
import type { TicketCommunicationCapabilities } from "./communication-model";
import type { TicketMetadataMutationCapabilities } from "./mutation-model";
export { defaultTicketListQuery } from "@/core/ticket-list-query";

export type TicketReadUnavailableReason =
  | "no-active-connection"
  | "inactive-connection"
  | "missing-credentials"
  | "personal-connection-required"
  | "unknown-provider"
  | "unsupported-capability"
  | "provider-auth-failed"
  | "provider-permission-denied"
  | "provider-rate-limited"
  | "provider-temporary-failure"
  | "provider-unexpected-response"
  | "invalid-search-query"
  | "unsupported-query"
  | "query-too-expensive"
  | "invalid-connection";

export type TicketReadUnavailable = {
  status: "unavailable";
  reason: TicketReadUnavailableReason;
  retryable: boolean;
  queryRejection?: TicketListQueryRejection;
};

export type TicketListAvailable = {
  status: "available";
  connectionName: string;
  helpdeskConnectionId: string;
  workspaceId: string;
  communicationCapabilities: TicketCommunicationCapabilities;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  queryCapabilities?: TicketListQueryCapabilities;
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
  helpdeskConnectionId?: string;
  workspaceId?: string;
  resolution?: TicketMergeResolution;
};

export type TicketDetailReplaced = {
  status: "replaced";
  cause: "merged";
  sourceExternalId: TicketExternalId;
  sourceNumber?: string;
  targetExternalId: TicketExternalId;
};

export type TicketDetailRetired = {
  status: "retired";
  reason: "merged-target-unavailable";
  retryable: false;
  sourceExternalId: TicketExternalId;
  sourceNumber?: string;
};

export type TicketListReadResult = TicketListAvailable | TicketReadUnavailable;
export type TicketDetailReadResult =
  | TicketDetailAvailable
  | TicketDetailRetired
  | TicketReadUnavailable;

export type TicketDetailProviderReadResult =
  | TicketDetailReadResult
  | TicketDetailReplaced;

export function unavailableTicketRead(
  reason: TicketReadUnavailableReason,
  retryable = false,
  queryRejection?: TicketListQueryRejection,
): TicketReadUnavailable {
  return { status: "unavailable", reason, retryable, queryRejection };
}

export function selectedTicketExternalId(
  value: string | string[] | undefined,
): TicketExternalId | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value || undefined;
}

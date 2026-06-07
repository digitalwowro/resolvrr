import { safeLogMetadata } from "@/security/safe-log";

export type TicketReadOperation = "list" | "detail" | "lookup" | "mutation";

export type TicketReadTimingPhase =
  | "active-connection-lookup"
  | "credential-decrypt"
  | "base-url-security-revalidation"
  | "provider-list-request"
  | "cache-detail-read"
  | "cache-detail-write"
  | "cache-detail-invalidation"
  | "provider-detail-metadata-request"
  | "provider-detail-refresh"
  | "provider-secondary-tags-request"
  | "provider-secondary-links-request"
  | "provider-secondary-subscription-request"
  | "provider-secondary-group-lookup-request"
  | "provider-tag-lookup-request"
  | "provider-link-target-lookup-request"
  | "provider-metadata-mutation-current-ticket-request"
  | "provider-metadata-mutation-request"
  | "provider-article-thread-request"
  | "provider-lookup-request"
  | "provider-user-lookup-request"
  | "provider-mapping-parsing"
  | "total-list-load"
  | "total-detail-load"
  | "total-metadata-mutation";

export type TicketReadTimingStatus = "ok" | "unavailable" | "error";

export type TicketReadCacheDataKind = "ticket-detail";
export type TicketReadCacheEvent =
  | "bypass"
  | "hit"
  | "miss"
  | "read-failed"
  | "refresh-failed"
  | "refresh-started"
  | "refresh-succeeded"
  | "stale"
  | "write-failed"
  | "write-succeeded";

type TicketReadTimingInput = {
  cacheDataKind?: TicketReadCacheDataKind;
  cacheEvent?: TicketReadCacheEvent;
  connectionId?: string;
  durationMs: number;
  freshnessAgeBucket?: string;
  operation: TicketReadOperation;
  phase: TicketReadTimingPhase;
  providerKey?: string;
  reason?: string;
  retryable?: boolean;
  status: TicketReadTimingStatus;
};

type TicketReadPhaseMetadata = Omit<
  TicketReadTimingInput,
  "durationMs" | "phase" | "status"
>;

export function ticketReadTimingStart() {
  return performance.now();
}

export function ticketReadTimingDuration(start: number) {
  return Math.round((performance.now() - start) * 100) / 100;
}

export function recordTicketReadTiming(input: TicketReadTimingInput) {
  console.info(
    "Ticket read timing",
    safeLogMetadata({
      connectionId: input.connectionId,
      cacheDataKind: input.cacheDataKind,
      cacheEvent: input.cacheEvent,
      durationMs: input.durationMs,
      freshnessAgeBucket: input.freshnessAgeBucket,
      operation: input.operation,
      phase: input.phase,
      providerKey: input.providerKey,
      reason: input.reason,
      retryable: input.retryable,
      status: input.status,
    }),
  );
}

function errorReason(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "kind" in error &&
    typeof error.kind === "string"
  ) {
    return error.kind;
  }

  return error instanceof Error ? error.name : "unknown-error";
}

function errorRetryable(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "retryable" in error &&
    typeof error.retryable === "boolean"
  ) {
    return error.retryable;
  }

  return undefined;
}

export async function measureTicketReadPhase<T>(
  phase: TicketReadTimingPhase,
  metadata: TicketReadPhaseMetadata,
  callback: () => Promise<T>,
): Promise<T> {
  const start = ticketReadTimingStart();
  try {
    const result = await callback();
    recordTicketReadTiming({
      ...metadata,
      durationMs: ticketReadTimingDuration(start),
      phase,
      status: "ok",
    });
    return result;
  } catch (error) {
    recordTicketReadTiming({
      ...metadata,
      durationMs: ticketReadTimingDuration(start),
      phase,
      reason: errorReason(error),
      retryable: errorRetryable(error),
      status: "error",
    });
    throw error;
  }
}

import { safeLogMetadata } from "@/security/safe-log";

export type TicketReadOperation = "list" | "detail" | "mutation";

export type TicketReadTimingPhase =
  | "active-connection-lookup"
  | "credential-decrypt"
  | "base-url-security-revalidation"
  | "provider-list-request"
  | "provider-detail-metadata-request"
  | "provider-secondary-tags-request"
  | "provider-secondary-links-request"
  | "provider-secondary-group-lookup-request"
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

type TicketReadTimingInput = {
  connectionId?: string;
  durationMs: number;
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
      durationMs: input.durationMs,
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

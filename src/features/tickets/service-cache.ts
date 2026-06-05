import type { TicketDetail, TicketExternalId } from "@/core/tickets";
import {
  recordTicketReadTiming,
  ticketReadTimingDuration,
  ticketReadTimingStart,
  type TicketReadOperation,
} from "@/telemetry/ticket-read-timing";
import type { TicketProviderContext } from "./connection-context";
import type { TicketDetailCacheRepository } from "./cache-repository";

type TicketDetailCacheContext = {
  cacheRepository: TicketDetailCacheRepository;
  encryptionKey: string;
  operation: TicketReadOperation;
  providerContext: TicketProviderContext;
  ticketExternalId: TicketExternalId;
  userId: string;
};

type TicketDetailCacheTimingContext = Pick<
  TicketDetailCacheContext,
  "operation" | "providerContext"
>;

function timingContext(input: TicketDetailCacheTimingContext) {
  return {
    connectionId: input.providerContext.context.connection.id,
    operation: input.operation,
    providerKey: input.providerContext.context.connection.providerKey,
  };
}

export async function readFreshTicketDetailCache(
  input: TicketDetailCacheContext,
): Promise<TicketDetail | null> {
  if (!input.cacheRepository.enabled) {
    return null;
  }

  const start = ticketReadTimingStart();
  try {
    const detail = await input.cacheRepository.findFreshTicketDetail({
      encryptionKey: input.encryptionKey,
      helpdeskConnectionId: input.providerContext.context.connection.id,
      ticketExternalId: input.ticketExternalId,
      userId: input.userId,
    });
    recordTicketReadTiming({
      ...timingContext(input),
      durationMs: ticketReadTimingDuration(start),
      phase: "cache-detail-read",
      reason: detail ? undefined : "cache-miss",
      status: detail ? "ok" : "unavailable",
    });
    return detail;
  } catch {
    recordTicketReadTiming({
      ...timingContext(input),
      durationMs: ticketReadTimingDuration(start),
      phase: "cache-detail-read",
      reason: "cache-error",
      retryable: true,
      status: "error",
    });
    return null;
  }
}

export async function storeTicketDetailCache(
  input: TicketDetailCacheContext & { detail: TicketDetail },
): Promise<void> {
  if (!input.cacheRepository.enabled) {
    return;
  }

  const start = ticketReadTimingStart();
  try {
    await input.cacheRepository.storeTicketDetail({
      detail: input.detail,
      encryptionKey: input.encryptionKey,
      helpdeskConnectionId: input.providerContext.context.connection.id,
      ticketExternalId: input.ticketExternalId,
      userId: input.userId,
    });
    recordTicketReadTiming({
      ...timingContext(input),
      durationMs: ticketReadTimingDuration(start),
      phase: "cache-detail-write",
      status: "ok",
    });
  } catch {
    recordTicketReadTiming({
      ...timingContext(input),
      durationMs: ticketReadTimingDuration(start),
      phase: "cache-detail-write",
      reason: "cache-error",
      retryable: true,
      status: "error",
    });
  }
}

export async function invalidateTicketDetailCache(
  input: Omit<TicketDetailCacheContext, "encryptionKey">,
): Promise<void> {
  if (!input.cacheRepository.enabled) {
    return;
  }

  const start = ticketReadTimingStart();
  try {
    await input.cacheRepository.invalidateTicketDetail({
      helpdeskConnectionId: input.providerContext.context.connection.id,
      ticketExternalId: input.ticketExternalId,
      userId: input.userId,
    });
    recordTicketReadTiming({
      ...timingContext(input),
      durationMs: ticketReadTimingDuration(start),
      phase: "cache-detail-invalidation",
      status: "ok",
    });
  } catch {
    recordTicketReadTiming({
      ...timingContext(input),
      durationMs: ticketReadTimingDuration(start),
      phase: "cache-detail-invalidation",
      reason: "cache-error",
      retryable: true,
      status: "error",
    });
  }
}

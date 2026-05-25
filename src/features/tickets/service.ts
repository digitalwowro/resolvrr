import type { TicketExternalId, TicketMetadataMutationInput } from "@/core/tickets";
import type { TicketListQueryInput } from "@/core/providers";
import { normalizeTicketListQuery } from "@/core/ticket-list-query";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  recordTicketReadTiming,
  ticketReadTimingDuration,
  ticketReadTimingStart,
} from "@/telemetry/ticket-read-timing";
import { loadActiveTicketProviderContext } from "./connection-context";
import {
  dispatchTicketDetailRead,
  dispatchTicketListRead,
  dispatchTicketMetadataMutation,
} from "./provider-dispatch";
import {
  hasTicketMetadataMutationInput,
  type TicketMetadataMutationResult,
} from "./mutation-model";
import {
  defaultTicketListQuery,
  type TicketDetailReadResult,
  type TicketListReadResult,
  type TicketReadUnavailable,
} from "./read-model";

function failedMutation(
  result: TicketReadUnavailable,
): TicketMetadataMutationResult {
  return {
    status: "failed",
    reason: result.reason,
    retryable: result.retryable,
  };
}

export async function loadWorkspaceTicketList(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  query: TicketListQueryInput = {},
): Promise<TicketListReadResult> {
  const totalStart = ticketReadTimingStart();
  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "list",
  );
  if (providerContext.status === "unavailable") {
    recordTicketReadTiming({
      durationMs: ticketReadTimingDuration(totalStart),
      operation: "list",
      phase: "total-list-load",
      reason: providerContext.reason,
      retryable: providerContext.retryable,
      status: "unavailable",
    });
    return providerContext;
  }

  const result = await dispatchTicketListRead(
    providerContext.value,
    normalizeTicketListQuery(query),
  );
  recordTicketReadTiming({
    connectionId: providerContext.value.context.connection.id,
    durationMs: ticketReadTimingDuration(totalStart),
    operation: "list",
    phase: "total-list-load",
    providerKey: providerContext.value.context.connection.providerKey,
    reason: result.status === "unavailable" ? result.reason : undefined,
    retryable: result.status === "unavailable" ? result.retryable : undefined,
    status: result.status === "available" ? "ok" : "unavailable",
  });
  return result;
}

export async function loadWorkspaceTicketDetail(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: TicketExternalId,
): Promise<TicketDetailReadResult> {
  const totalStart = ticketReadTimingStart();
  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "detail",
  );
  if (providerContext.status === "unavailable") {
    recordTicketReadTiming({
      durationMs: ticketReadTimingDuration(totalStart),
      operation: "detail",
      phase: "total-detail-load",
      reason: providerContext.reason,
      retryable: providerContext.retryable,
      status: "unavailable",
    });
    return providerContext;
  }

  const result = await dispatchTicketDetailRead(
    providerContext.value,
    ticketExternalId,
  );
  recordTicketReadTiming({
    connectionId: providerContext.value.context.connection.id,
    durationMs: ticketReadTimingDuration(totalStart),
    operation: "detail",
    phase: "total-detail-load",
    providerKey: providerContext.value.context.connection.providerKey,
    reason: result.status === "unavailable" ? result.reason : undefined,
    retryable: result.status === "unavailable" ? result.retryable : undefined,
    status: result.status === "available" ? "ok" : "unavailable",
  });
  return result;
}

export async function updateWorkspaceTicketMetadata(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: TicketExternalId,
  input: TicketMetadataMutationInput,
): Promise<TicketMetadataMutationResult> {
  const totalStart = ticketReadTimingStart();
  if (!hasTicketMetadataMutationInput(input)) {
    return { status: "failed", reason: "invalid-input", retryable: false };
  }

  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "mutation",
  );
  if (providerContext.status === "unavailable") {
    recordTicketReadTiming({
      durationMs: ticketReadTimingDuration(totalStart),
      operation: "mutation",
      phase: "total-metadata-mutation",
      reason: providerContext.reason,
      retryable: providerContext.retryable,
      status: "unavailable",
    });
    return failedMutation(providerContext);
  }

  const mutationResult = await dispatchTicketMetadataMutation(
    providerContext.value,
    ticketExternalId,
    input,
  );
  if (mutationResult.status !== "saved") {
    recordTicketReadTiming({
      connectionId: providerContext.value.context.connection.id,
      durationMs: ticketReadTimingDuration(totalStart),
      operation: "mutation",
      phase: "total-metadata-mutation",
      providerKey: providerContext.value.context.connection.providerKey,
      reason: mutationResult.reason,
      retryable: mutationResult.retryable,
      status: "unavailable",
    });
    return mutationResult;
  }

  const [detailRefresh, listRefresh] = await Promise.all([
    dispatchTicketDetailRead(providerContext.value, ticketExternalId),
    dispatchTicketListRead(providerContext.value, defaultTicketListQuery),
  ]);
  const refreshFailure =
    detailRefresh.status === "unavailable"
      ? detailRefresh
      : listRefresh.status === "unavailable"
        ? listRefresh
        : undefined;

  recordTicketReadTiming({
    connectionId: providerContext.value.context.connection.id,
    durationMs: ticketReadTimingDuration(totalStart),
    operation: "mutation",
    phase: "total-metadata-mutation",
    providerKey: providerContext.value.context.connection.providerKey,
    reason: refreshFailure?.reason,
    retryable: refreshFailure?.retryable,
    status: refreshFailure ? "unavailable" : "ok",
  });

  if (refreshFailure) {
    return {
      status: "saved-refresh-failed",
      reason: refreshFailure.reason,
      retryable: refreshFailure.retryable,
    };
  }

  return { status: "saved" };
}

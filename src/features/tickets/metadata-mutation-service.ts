import type {
  TicketExternalId,
  TicketMetadataMutationInput,
} from "@/core/tickets";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  invalidateAiSummaryTicketCache,
} from "@/features/ai/summary-cache-invalidation";
import {
  noAiSummaryCacheRepository,
  type AiSummaryCacheRepository,
} from "@/features/ai/summary-cache-repository";
import {
  recordTicketReadTiming,
  ticketReadTimingDuration,
  ticketReadTimingStart,
} from "@/telemetry/ticket-read-timing";
import { recordTicketMetadataMutationAudit } from "@/telemetry/ticket-mutation-audit";
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
  noTicketDetailCacheRepository,
  type TicketDetailCacheRepository,
} from "./cache-repository";
import {
  defaultTicketListQuery,
  type TicketReadUnavailable,
} from "./read-model";
import {
  invalidateTicketDetailCache,
  storeTicketDetailCache,
} from "./service-cache";

function failedMutation(
  result: TicketReadUnavailable,
): TicketMetadataMutationResult {
  return {
    status: "failed",
    reason: result.reason,
    retryable: result.retryable,
  };
}

export async function updateWorkspaceTicketMetadata(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: TicketExternalId,
  input: TicketMetadataMutationInput,
  cacheRepository: TicketDetailCacheRepository = noTicketDetailCacheRepository,
  aiSummaryCacheRepository: AiSummaryCacheRepository = noAiSummaryCacheRepository,
): Promise<TicketMetadataMutationResult> {
  const totalStart = ticketReadTimingStart();
  if (!hasTicketMetadataMutationInput(input)) {
    recordTicketMetadataMutationAudit({
      input,
      reason: "invalid-input",
      retryable: false,
      status: "failed",
    });
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
    recordTicketMetadataMutationAudit({
      input,
      reason: providerContext.reason,
      retryable: providerContext.retryable,
      status: "failed",
    });
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

  const mutationLogContext = {
    connectionId: providerContext.value.context.connection.id,
    providerKey: providerContext.value.context.connection.providerKey,
  };
  const mutationResult = await dispatchTicketMetadataMutation(
    providerContext.value,
    ticketExternalId,
    input,
  );
  if (mutationResult.status !== "saved") {
    recordTicketMetadataMutationAudit({
      ...mutationLogContext,
      input,
      reason: mutationResult.reason,
      retryable: mutationResult.retryable,
      status: "failed",
    });
    recordTicketReadTiming({
      ...mutationLogContext,
      durationMs: ticketReadTimingDuration(totalStart),
      operation: "mutation",
      phase: "total-metadata-mutation",
      reason: mutationResult.reason,
      retryable: mutationResult.retryable,
      status: "unavailable",
    });
    return mutationResult;
  }

  await invalidateTicketDetailCache({
    cacheRepository,
    operation: "mutation",
    providerContext: providerContext.value,
    ticketExternalId,
    userId,
  });
  await invalidateAiSummaryTicketCache({
    cacheRepository: aiSummaryCacheRepository,
    helpdeskConnectionId: providerContext.value.context.connection.id,
    ticketExternalId,
    userId,
  });

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
    ...mutationLogContext,
    durationMs: ticketReadTimingDuration(totalStart),
    operation: "mutation",
    phase: "total-metadata-mutation",
    reason: refreshFailure?.reason,
    retryable: refreshFailure?.retryable,
    status: refreshFailure ? "unavailable" : "ok",
  });

  if (refreshFailure) {
    recordTicketMetadataMutationAudit({
      ...mutationLogContext,
      input,
      reason: refreshFailure.reason,
      retryable: refreshFailure.retryable,
      status: "saved-refresh-failed",
    });
    return {
      status: "saved-refresh-failed",
      reason: refreshFailure.reason,
      retryable: refreshFailure.retryable,
    };
  }

  if (detailRefresh.status === "available") {
    await storeTicketDetailCache({
      cacheRepository,
      detail: detailRefresh.detail,
      encryptionKey,
      operation: "mutation",
      providerContext: providerContext.value,
      ticketExternalId,
      userId,
    });
  }

  recordTicketMetadataMutationAudit({
    ...mutationLogContext,
    input,
    status: "saved",
  });

  return { status: "saved" };
}

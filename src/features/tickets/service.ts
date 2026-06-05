import type {
  TicketExternalId,
  TicketMetadataMutationInput,
} from "@/core/tickets";
import type { ProviderCapability, TicketListQueryInput } from "@/core/providers";
import { normalizeTicketListQuery } from "@/core/ticket-list-query";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
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
  dispatchTicketLookupDataRead,
  dispatchTicketMetadataMutation,
} from "./provider-dispatch";
import { guardTicketListQuery } from "./list-query-guardrails";
import {
  hasTicketMetadataMutationInput,
  type TicketMetadataMutationResult,
} from "./mutation-model";
import {
  defaultTicketListQuery,
  unavailableTicketRead,
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
function hasProviderCapability(
  capabilities: ProviderCapability[],
  capability: ProviderCapability,
) {
  return capabilities.includes(capability);
}
function countAwareListQueryInput(
  capabilities: ProviderCapability[],
  query: TicketListQueryInput,
): TicketListQueryInput {
  if (
    query.count ||
    query.group ||
    !hasProviderCapability(capabilities, "ticket:count")
  ) {
    return query;
  }

  return { ...query, count: { includeTotal: true } };
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

  const countAwareQuery = countAwareListQueryInput(
    providerContext.value.plugin.capabilities,
    query,
  );
  const listQuery = normalizeTicketListQuery(countAwareQuery);
  const guardrail = guardTicketListQuery(
    providerContext.value.plugin.capabilities,
    listQuery,
    countAwareQuery,
  );
  if (guardrail.status === "unsupported") {
    const result = unavailableTicketRead(
      guardrail.reason,
      false,
      guardrail.rejection,
    );
    recordTicketReadTiming({
      connectionId: providerContext.value.context.connection.id,
      durationMs: ticketReadTimingDuration(totalStart),
      operation: "list",
      phase: "total-list-load",
      providerKey: providerContext.value.context.connection.providerKey,
      reason: result.reason,
      retryable: result.retryable,
      status: "unavailable",
    });
    return result;
  }

  const result = await dispatchTicketListRead(providerContext.value, listQuery);
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

  const [result, lookupData] = await Promise.all([
    dispatchTicketDetailRead(providerContext.value, ticketExternalId),
    dispatchTicketLookupDataRead(providerContext.value),
  ]);
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
  if (result.status === "unavailable") {
    return result;
  }

  return {
    status: "available",
    detail: {
      ...result.detail,
      lookupData,
    },
  };
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
    recordTicketMetadataMutationAudit({ input, reason: "invalid-input", retryable: false, status: "failed" });
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

  recordTicketMetadataMutationAudit({
    ...mutationLogContext,
    input,
    status: "saved",
  });

  return { status: "saved" };
}

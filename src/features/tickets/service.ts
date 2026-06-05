import type { TicketExternalId } from "@/core/tickets";
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
  dispatchTicketLookupDataRead,
} from "./provider-dispatch";
import { guardTicketListQuery } from "./list-query-guardrails";
import {
  noTicketDetailCacheRepository,
  type TicketDetailCacheLoadOptions,
  type TicketDetailCacheRepository,
} from "./cache-repository";
import {
  unavailableTicketRead,
  type TicketDetailReadResult,
  type TicketListReadResult,
} from "./read-model";
import { countAwareListQueryInput } from "./service-list-query";
import {
  readFreshTicketDetailCache,
  storeTicketDetailCache,
} from "./service-cache";
export { updateWorkspaceTicketMetadata } from "./metadata-mutation-service";

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
  cacheRepository: TicketDetailCacheRepository = noTicketDetailCacheRepository,
  options: TicketDetailCacheLoadOptions = {},
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

  if (options.cacheMode !== "bypass") {
    const cachedDetail = await readFreshTicketDetailCache({
      cacheRepository,
      encryptionKey,
      operation: "detail",
      providerContext: providerContext.value,
      ticketExternalId,
      userId,
    });
    if (cachedDetail) {
      const lookupData = await dispatchTicketLookupDataRead(providerContext.value);
      recordTicketReadTiming({
        connectionId: providerContext.value.context.connection.id,
        durationMs: ticketReadTimingDuration(totalStart),
        operation: "detail",
        phase: "total-detail-load",
        providerKey: providerContext.value.context.connection.providerKey,
        status: "ok",
      });
      return {
        status: "available",
        detail: {
          ...cachedDetail,
          lookupData,
        },
      };
    }
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

  await storeTicketDetailCache({
    cacheRepository,
    detail: result.detail,
    encryptionKey,
    operation: "detail",
    providerContext: providerContext.value,
    ticketExternalId,
    userId,
  });

  return {
    status: "available",
    detail: {
      ...result.detail,
      lookupData,
    },
  };
}

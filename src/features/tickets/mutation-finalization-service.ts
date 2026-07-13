import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import { invalidateAiSummaryTicketCache } from "@/features/ai/summary-cache-invalidation";
import {
  noAiSummaryCacheRepository,
  type AiSummaryCacheRepository,
} from "@/features/ai/summary-cache-repository";
import { loadActiveTicketProviderContext } from "./connection-context";
import {
  noTicketDetailCacheRepository,
  type TicketDetailCacheRepository,
} from "./cache-repository";
import { dispatchTicketDetailRead, dispatchTicketListRead } from "./provider-dispatch";
import { defaultTicketListQuery } from "./read-model";
import { invalidateTicketDetailCache, storeTicketDetailCache } from "./service-cache";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketMutationFinalizationOptions = { finalize?: boolean };
export type TicketMutationFinalizationResult =
  | { status: "saved" }
  | { status: "saved-refresh-failed"; reason: TicketReadUnavailableReason; retryable: boolean };

export async function finalizeWorkspaceTicketMutation(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: string,
  cacheRepository: TicketDetailCacheRepository = noTicketDetailCacheRepository,
  aiSummaryCacheRepository: AiSummaryCacheRepository = noAiSummaryCacheRepository,
): Promise<TicketMutationFinalizationResult> {
  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "mutation",
  );
  if (providerContext.status === "unavailable") {
    return {
      status: "saved-refresh-failed",
      reason: providerContext.reason,
      retryable: providerContext.retryable,
    };
  }
  await Promise.all([
    invalidateTicketDetailCache({
      cacheRepository,
      operation: "mutation",
      providerContext: providerContext.value,
      ticketExternalId,
      userId,
    }),
    invalidateAiSummaryTicketCache({
      cacheRepository: aiSummaryCacheRepository,
      helpdeskConnectionId: providerContext.value.context.connection.id,
      ticketExternalId,
      userId,
    }),
  ]);
  const [detail, list] = await Promise.all([
    dispatchTicketDetailRead(providerContext.value, ticketExternalId),
    dispatchTicketListRead(providerContext.value, defaultTicketListQuery),
  ]);
  if (detail.status === "unavailable") {
    return { status: "saved-refresh-failed", reason: detail.reason, retryable: detail.retryable };
  }
  if (list.status === "unavailable") {
    return { status: "saved-refresh-failed", reason: list.reason, retryable: list.retryable };
  }
  await storeTicketDetailCache({
    cacheRepository,
    detail: detail.detail,
    encryptionKey,
    operation: "mutation",
    providerContext: providerContext.value,
    ticketExternalId,
    userId,
  });
  return { status: "saved" };
}

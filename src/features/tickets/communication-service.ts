import type {
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
} from "@/core/tickets";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  noAiSummaryCacheRepository,
  type AiSummaryCacheRepository,
} from "@/features/ai/summary-cache-repository";
import {
  recordTicketCommunicationAudit,
  type TicketCommunicationAuditKind,
} from "@/telemetry/ticket-communication-audit";
import { loadActiveTicketProviderContext } from "./connection-context";
import {
  dispatchTicketCustomerReply,
  dispatchTicketInternalNote,
} from "./communication-dispatch";
import {
  noTicketDetailCacheRepository,
  type TicketDetailCacheRepository,
} from "./cache-repository";
import {
  finalizeWorkspaceTicketMutation,
  type TicketMutationFinalizationOptions,
} from "./mutation-finalization-service";
import type {
  TicketCommunicationErrorReason,
  TicketCustomerReplyResult,
  TicketInternalNoteResult,
} from "./communication-model";

type CommunicationAuditContext = {
  connectionId?: string;
  providerKey?: string;
};

type CommunicationFailedResult = {
  reason: TicketCommunicationErrorReason;
  retryable: boolean;
  status: "failed";
};

function failedNoteResult(
  result: Awaited<ReturnType<typeof loadActiveTicketProviderContext>>,
): CommunicationFailedResult {
  return {
    status: "failed",
    reason: result.status === "unavailable"
      ? result.reason
      : "provider-unexpected-response",
    retryable: result.status === "unavailable" ? result.retryable : false,
  };
}

function communicationAuditContext(
  result: Awaited<ReturnType<typeof loadActiveTicketProviderContext>>,
): CommunicationAuditContext {
  if (result.status === "available") {
    return {
      connectionId: result.value.context.connection.id,
      providerKey: result.value.context.connection.providerKey,
    };
  }

  return {};
}

function recordFailedCommunicationAudit(
  kind: TicketCommunicationAuditKind,
  context: CommunicationAuditContext,
  result: { reason: string; retryable: boolean },
) {
  recordTicketCommunicationAudit({
    ...context,
    kind,
    reason: result.reason,
    retryable: result.retryable,
    status: "failed",
  });
}

function recordSavedCommunicationAudit(
  kind: TicketCommunicationAuditKind,
  context: CommunicationAuditContext,
) {
  recordTicketCommunicationAudit({
    ...context,
    kind,
    status: "saved",
  });
}

function recordUncertainCommunicationAudit(
  kind: TicketCommunicationAuditKind,
  context: CommunicationAuditContext,
  result: { reason: string; retryable: boolean },
) {
  recordTicketCommunicationAudit({
    ...context,
    kind,
    reason: result.reason,
    retryable: result.retryable,
    status: "saved-refresh-failed",
  });
}

function failedReplyResult(
  result: Awaited<ReturnType<typeof loadActiveTicketProviderContext>>,
): CommunicationFailedResult {
  return {
    status: "failed",
    reason: result.status === "unavailable"
      ? result.reason
      : "provider-unexpected-response",
    retryable: result.status === "unavailable" ? result.retryable : false,
  };
}

export async function addWorkspaceTicketInternalNote(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: string,
  input: TicketInternalNoteInput,
  cacheRepository: TicketDetailCacheRepository = noTicketDetailCacheRepository,
  aiSummaryCacheRepository: AiSummaryCacheRepository = noAiSummaryCacheRepository,
  options: TicketMutationFinalizationOptions = {},
): Promise<TicketInternalNoteResult> {
  if (!ticketExternalId.trim() || !input.body.trim()) {
    recordFailedCommunicationAudit(
      "internal-note",
      {},
      { reason: "invalid-input", retryable: false },
    );
    return { status: "failed", reason: "invalid-input", retryable: false };
  }

  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "mutation",
  );
  const auditContext = communicationAuditContext(providerContext);
  if (providerContext.status === "unavailable") {
    const result = failedNoteResult(providerContext);
    recordFailedCommunicationAudit("internal-note", auditContext, result);
    return result;
  }

  const result = await dispatchTicketInternalNote(
    providerContext.value,
    ticketExternalId,
    input,
  );
  if (result.status !== "saved") {
    recordFailedCommunicationAudit("internal-note", auditContext, result);
    return result;
  }

  if (options.finalize !== false) {
    const result = await finalizeWorkspaceTicketMutation(
      repository, registry, encryptionKey, userId, ticketExternalId,
      cacheRepository, aiSummaryCacheRepository,
    );
    if (result.status !== "saved") {
    recordUncertainCommunicationAudit("internal-note", auditContext, result);
    return result;
    }
  }
  recordSavedCommunicationAudit("internal-note", auditContext);
  return { status: "saved" };
}

export async function addWorkspaceTicketCustomerReply(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: string,
  input: TicketCustomerReplyInput,
  cacheRepository: TicketDetailCacheRepository = noTicketDetailCacheRepository,
  aiSummaryCacheRepository: AiSummaryCacheRepository = noAiSummaryCacheRepository,
  options: TicketMutationFinalizationOptions = {},
): Promise<TicketCustomerReplyResult> {
  if (!ticketExternalId.trim() || !input.body.trim()) {
    recordFailedCommunicationAudit(
      "customer-reply",
      {},
      { reason: "invalid-input", retryable: false },
    );
    return { status: "failed", reason: "invalid-input", retryable: false };
  }

  const providerContext = await loadActiveTicketProviderContext(
    repository,
    registry,
    encryptionKey,
    userId,
    "mutation",
  );
  const auditContext = communicationAuditContext(providerContext);
  if (providerContext.status === "unavailable") {
    const result = failedReplyResult(providerContext);
    recordFailedCommunicationAudit("customer-reply", auditContext, result);
    return result;
  }

  const result = await dispatchTicketCustomerReply(
    providerContext.value,
    ticketExternalId,
    input,
  );
  if (result.status !== "saved") {
    recordFailedCommunicationAudit("customer-reply", auditContext, result);
    return result;
  }

  if (options.finalize !== false) {
    const result = await finalizeWorkspaceTicketMutation(
      repository, registry, encryptionKey, userId, ticketExternalId,
      cacheRepository, aiSummaryCacheRepository,
    );
    if (result.status !== "saved") {
    recordUncertainCommunicationAudit("customer-reply", auditContext, result);
    return result;
    }
  }
  recordSavedCommunicationAudit("customer-reply", auditContext);
  return { status: "saved" };
}

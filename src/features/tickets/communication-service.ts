import type {
  TicketCustomerForwardInput,
  TicketCustomerReplyInput,
  TicketInternalNoteInput,
} from "@/core/tickets";
import type { ProviderRegistry } from "@/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import {
  noAiSummaryCacheRepository,
  type AiSummaryCacheRepository,
} from "@/features/ai/summary-cache-repository";
import { loadActiveTicketProviderContext } from "./connection-context";
import {
  dispatchTicketCustomerForward,
  dispatchTicketCustomerReply,
  dispatchTicketInternalNote,
} from "./communication-dispatch";
import {
  communicationAuditContext,
  failedCommunicationResult,
  recordFailedCommunicationAudit,
  recordSavedCommunicationAudit,
  recordUncertainCommunicationAudit,
} from "./communication-service-audit";
import {
  noTicketDetailCacheRepository,
  type TicketDetailCacheRepository,
} from "./cache-repository";
import {
  finalizeWorkspaceTicketMutation,
  type TicketMutationFinalizationOptions,
} from "./mutation-finalization-service";
import type {
  CommunicationFailedResult,
} from "./communication-service-audit";
import type {
  TicketCustomerForwardResult,
  TicketCustomerReplyResult,
  TicketInternalNoteResult,
} from "./communication-model";
import { ProviderError } from "@/core/providers";
import {
  assertReviewedTicketSignature,
  resolveWorkspaceTicketSignature,
} from "@/features/signatures/service";
import {
  noWorkspaceSignatureRepository,
  type WorkspaceSignatureRepository,
} from "@/features/signatures/repository";

type CommunicationServiceOptions = TicketMutationFinalizationOptions & {
  signatureRepository?: WorkspaceSignatureRepository;
};

function signatureFailure(error: unknown): CommunicationFailedResult {
  if (error instanceof ProviderError) {
    if (error.diagnosticCode === "signature-context-stale") {
      return { status: "failed", reason: "signature-context-stale", retryable: false };
    }
    if (error.diagnosticCode === "signature-context-unavailable") {
      return { status: "failed", reason: "signature-context-unavailable", retryable: error.retryable };
    }
  }
  return { status: "failed", reason: "provider-temporary-failure", retryable: true };
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
  options: CommunicationServiceOptions = {},
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
    const result = failedCommunicationResult(providerContext);
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
  options: CommunicationServiceOptions = {},
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
    const result = failedCommunicationResult(providerContext);
    recordFailedCommunicationAudit("customer-reply", auditContext, result);
    return result;
  }

  let resolvedSignature;
  try {
    resolvedSignature = await resolveWorkspaceTicketSignature({
      encryptionKey,
      providerContext: providerContext.value,
      repository: options.signatureRepository ?? noWorkspaceSignatureRepository,
      ticketExternalId,
      userId,
    });
    assertReviewedTicketSignature(input.signatureContext, resolvedSignature);
  } catch (error) {
    const result = signatureFailure(error);
    recordFailedCommunicationAudit("customer-reply", auditContext, result);
    return result;
  }
  const result = await dispatchTicketCustomerReply(
    providerContext.value, ticketExternalId, input, resolvedSignature,
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

export async function forwardWorkspaceTicketEmail(
  repository: HelpdeskConnectionsRepository,
  registry: ProviderRegistry,
  encryptionKey: string,
  userId: string,
  ticketExternalId: string,
  input: TicketCustomerForwardInput,
  cacheRepository: TicketDetailCacheRepository = noTicketDetailCacheRepository,
  aiSummaryCacheRepository: AiSummaryCacheRepository = noAiSummaryCacheRepository,
  options: CommunicationServiceOptions = {},
): Promise<TicketCustomerForwardResult> {
  if (!ticketExternalId.trim() || !input.subject.trim()) {
    const result = { reason: "invalid-input", retryable: false } as const;
    recordFailedCommunicationAudit("customer-forward", {}, result);
    return { status: "failed", ...result };
  }
  const providerContext = await loadActiveTicketProviderContext(
    repository, registry, encryptionKey, userId, "mutation",
  );
  const auditContext = communicationAuditContext(providerContext);
  if (providerContext.status === "unavailable") {
    const result = failedCommunicationResult(providerContext);
    recordFailedCommunicationAudit("customer-forward", auditContext, result);
    return result;
  }
  let resolvedSignature;
  try {
    resolvedSignature = await resolveWorkspaceTicketSignature({
      encryptionKey,
      providerContext: providerContext.value,
      repository: options.signatureRepository ?? noWorkspaceSignatureRepository,
      ticketExternalId,
      userId,
    });
    assertReviewedTicketSignature(input.signatureContext, resolvedSignature);
  } catch (error) {
    const result = signatureFailure(error);
    recordFailedCommunicationAudit("customer-forward", auditContext, result);
    return result;
  }
  const result = await dispatchTicketCustomerForward(
    providerContext.value, ticketExternalId, input, resolvedSignature,
  );
  if (result.status !== "saved") {
    recordFailedCommunicationAudit("customer-forward", auditContext, result);
    return result;
  }
  if (options.finalize !== false) {
    const finalized = await finalizeWorkspaceTicketMutation(
      repository, registry, encryptionKey, userId, ticketExternalId,
      cacheRepository, aiSummaryCacheRepository,
    );
    if (finalized.status !== "saved") {
      recordUncertainCommunicationAudit("customer-forward", auditContext, finalized);
      return finalized;
    }
  }
  recordSavedCommunicationAudit("customer-forward", auditContext);
  return { status: "saved" };
}

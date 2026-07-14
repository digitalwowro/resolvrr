import {
  recordTicketCommunicationAudit,
  type TicketCommunicationAuditKind,
} from "@/telemetry/ticket-communication-audit";
import type { loadActiveTicketProviderContext } from "./connection-context";
import type { TicketCommunicationErrorReason } from "./communication-model";

export type CommunicationAuditContext = {
  connectionId?: string;
  providerKey?: string;
};

export type CommunicationFailedResult = {
  reason: TicketCommunicationErrorReason;
  retryable: boolean;
  status: "failed";
};

export function failedCommunicationResult(
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

export function communicationAuditContext(
  result: Awaited<ReturnType<typeof loadActiveTicketProviderContext>>,
): CommunicationAuditContext {
  return result.status === "available"
    ? {
        connectionId: result.value.context.connection.id,
        providerKey: result.value.context.connection.providerKey,
      }
    : {};
}

export function recordFailedCommunicationAudit(
  kind: TicketCommunicationAuditKind,
  context: CommunicationAuditContext,
  result: { reason: string; retryable: boolean },
) {
  recordTicketCommunicationAudit({
    ...context, kind, reason: result.reason,
    retryable: result.retryable, status: "failed",
  });
}

export function recordSavedCommunicationAudit(
  kind: TicketCommunicationAuditKind,
  context: CommunicationAuditContext,
) {
  recordTicketCommunicationAudit({ ...context, kind, status: "saved" });
}

export function recordUncertainCommunicationAudit(
  kind: TicketCommunicationAuditKind,
  context: CommunicationAuditContext,
  result: { reason: string; retryable: boolean },
) {
  recordTicketCommunicationAudit({
    ...context, kind, reason: result.reason,
    retryable: result.retryable, status: "saved-refresh-failed",
  });
}

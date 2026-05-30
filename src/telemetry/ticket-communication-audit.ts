import { safeLogMetadata } from "@/security/safe-log";

export type TicketCommunicationAuditKind = "customer-reply" | "internal-note";

type TicketCommunicationAuditStatus =
  | "failed"
  | "saved"
  | "saved-refresh-failed";

type TicketCommunicationAuditInput = {
  connectionId?: string;
  kind: TicketCommunicationAuditKind;
  providerKey?: string;
  reason?: string;
  retryable?: boolean;
  status: TicketCommunicationAuditStatus;
};

export function recordTicketCommunicationAudit(
  input: TicketCommunicationAuditInput,
): void {
  console.info(
    "Ticket communication audit",
    safeLogMetadata({
      connectionId: input.connectionId,
      kind: input.kind,
      providerKey: input.providerKey,
      reason: input.reason,
      retryable: input.retryable,
      status: input.status,
    }),
  );
}

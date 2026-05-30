import type { TicketMetadataMutationInput } from "@/core/tickets";
import { safeLogMetadata } from "@/security/safe-log";

type TicketMetadataMutationAuditStatus =
  | "failed"
  | "saved"
  | "saved-refresh-failed";

type TicketMetadataMutationAuditInput = {
  connectionId?: string;
  input: TicketMetadataMutationInput;
  providerKey?: string;
  reason?: string;
  retryable?: boolean;
  status: TicketMetadataMutationAuditStatus;
};

function hasOwnValue(record: object, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, name);
}

export function ticketMetadataMutationAuditFields(
  input: TicketMetadataMutationInput,
): string {
  return [
    input.state ? "state" : undefined,
    input.priority ? "priority" : undefined,
    input.ownerExternalId ? "owner" : undefined,
    input.groupExternalId ? "group" : undefined,
    hasOwnValue(input, "tags") ? "tags" : undefined,
    input.linkAddExternalId || input.linkRemoveExternalIds?.length
      ? "links"
      : undefined,
    hasOwnValue(input, "subscriptionFollowing") ? "subscription" : undefined,
  ]
    .filter((field): field is string => Boolean(field))
    .join(",");
}

export function recordTicketMetadataMutationAudit(
  input: TicketMetadataMutationAuditInput,
): void {
  const fields = ticketMetadataMutationAuditFields(input.input);

  console.info(
    "Ticket metadata mutation audit",
    safeLogMetadata({
      connectionId: input.connectionId,
      fieldCount: fields ? fields.split(",").length : 0,
      fields,
      pendingDateIncluded: Boolean(input.input.pendingUntil),
      providerKey: input.providerKey,
      reason: input.reason,
      retryable: input.retryable,
      status: input.status,
    }),
  );
}

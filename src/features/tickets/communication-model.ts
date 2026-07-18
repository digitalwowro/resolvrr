import type { ProviderCapability } from "@/core/providers";
import type { TicketCustomerReplyInput } from "@/core/ticket-replies";
import type { TicketCustomerForwardInput } from "@/core/ticket-forwards";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketInternalNotePayload = {
  body: string;
  ticketExternalId: string;
};

export type TicketCustomerReplyPayload = TicketCustomerReplyInput & {
  ticketExternalId: string;
};

export type TicketCustomerForwardPayload = TicketCustomerForwardInput & {
  ticketExternalId: string;
};

export type TicketCommunicationCapabilities = {
  customerReplies: boolean;
  customerForwards?: boolean;
  internalNotes: boolean;
};

export type TicketCommunicationErrorReason =
  | TicketReadUnavailableReason
  | "invalid-input"
  | "invalid-mention"
  | "invalid-recipient"
  | "forward-context-stale"
  | "forward-context-unavailable"
  | "invalid-forward-attachment"
  | "forward-attachments-too-large"
  | "invalid-forward-subject"
  | "reply-context-stale"
  | "reply-context-unavailable"
  | "reply-history-context-stale"
  | "reply-history-too-large"
  | "reply-history-unavailable"
  | "signature-context-stale"
  | "signature-context-unavailable"
  | "delivery-uncertain"
  | "unsupported-reply-intent";

export type TicketInternalNoteResult =
  | { status: "saved" }
  | {
      status: "saved-refresh-failed";
      reason: TicketReadUnavailableReason;
      retryable: boolean;
    }
  | {
      status: "failed";
      reason: TicketCommunicationErrorReason;
      retryable: boolean;
    };

export type TicketCustomerReplyResult = TicketInternalNoteResult;
export type TicketCustomerForwardResult = TicketInternalNoteResult;

export type TicketInternalNoteActionState = {
  status: "idle" | "saved" | "saved-refresh-failed" | "failed";
  message?: string;
};

export type TicketCustomerReplyActionState = TicketInternalNoteActionState;

export const noTicketCommunicationCapabilities: TicketCommunicationCapabilities = {
  customerReplies: false,
  customerForwards: false,
  internalNotes: false,
};

export function ticketCommunicationCapabilities(
  capabilities: ProviderCapability[],
): TicketCommunicationCapabilities {
  return {
    customerReplies: capabilities.includes("ticket:add-customer-reply"),
    customerForwards: capabilities.includes("ticket:forward-customer-email"),
    internalNotes: capabilities.includes("ticket:add-internal-note"),
  };
}

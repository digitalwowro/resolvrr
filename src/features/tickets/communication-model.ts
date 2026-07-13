import type { ProviderCapability } from "@/core/providers";
import type { TicketCustomerReplyInput } from "@/core/ticket-replies";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketInternalNotePayload = {
  body: string;
  ticketExternalId: string;
};

export type TicketCustomerReplyPayload = TicketCustomerReplyInput & {
  ticketExternalId: string;
};

export type TicketCommunicationCapabilities = {
  customerReplies: boolean;
  internalNotes: boolean;
};

export type TicketCommunicationErrorReason =
  | TicketReadUnavailableReason
  | "invalid-input"
  | "invalid-recipient"
  | "reply-context-stale"
  | "reply-context-unavailable"
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

export type TicketInternalNoteActionState = {
  status: "idle" | "saved" | "saved-refresh-failed" | "failed";
  message?: string;
};

export type TicketCustomerReplyActionState = TicketInternalNoteActionState;

export const noTicketCommunicationCapabilities: TicketCommunicationCapabilities = {
  customerReplies: false,
  internalNotes: false,
};

export function ticketCommunicationCapabilities(
  capabilities: ProviderCapability[],
): TicketCommunicationCapabilities {
  return {
    customerReplies: capabilities.includes("ticket:add-customer-reply"),
    internalNotes: capabilities.includes("ticket:add-internal-note"),
  };
}

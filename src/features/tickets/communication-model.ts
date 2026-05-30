import type { ProviderCapability } from "@/core/providers";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketInternalNotePayload = {
  body: string;
  ticketExternalId: string;
};

export type TicketCommunicationCapabilities = {
  internalNotes: boolean;
};

export type TicketCommunicationErrorReason =
  | TicketReadUnavailableReason
  | "invalid-input";

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

export type TicketInternalNoteActionState = {
  status: "idle" | "saved" | "saved-refresh-failed" | "failed";
  message?: string;
};

export const noTicketCommunicationCapabilities: TicketCommunicationCapabilities = {
  internalNotes: false,
};

export function ticketCommunicationCapabilities(
  capabilities: ProviderCapability[],
): TicketCommunicationCapabilities {
  return {
    internalNotes: capabilities.includes("ticket:add-internal-note"),
  };
}

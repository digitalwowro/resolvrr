import type { ProviderCapability } from "@/core/providers";
import type { TicketMetadataMutationInput } from "@/core/tickets";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketMetadataMutationField = "state" | "priority";

export type TicketMetadataMutationCapabilities = {
  state: boolean;
  priority: boolean;
};

export type TicketMetadataMutationErrorReason =
  | TicketReadUnavailableReason
  | "invalid-input"
  | "unavailable-transition";

export type TicketMetadataMutationResult =
  | { status: "saved" }
  | {
      status: "saved-refresh-failed";
      reason: TicketReadUnavailableReason;
      retryable: boolean;
    }
  | {
      status: "failed";
      reason: TicketMetadataMutationErrorReason;
      retryable: boolean;
    };

export type TicketMetadataMutationActionState = {
  status: "idle" | "saved" | "saved-refresh-failed" | "failed";
  field?: TicketMetadataMutationField;
  message?: string;
};

export const noTicketMetadataMutationCapabilities: TicketMetadataMutationCapabilities = {
  state: false,
  priority: false,
};

export function ticketMetadataMutationCapabilities(
  capabilities: ProviderCapability[],
): TicketMetadataMutationCapabilities {
  return {
    state: capabilities.includes("ticket:update-state"),
    priority: capabilities.includes("ticket:update-priority"),
  };
}

export function hasTicketMetadataMutationInput(
  input: TicketMetadataMutationInput,
): boolean {
  return Boolean(input.state || input.priority);
}

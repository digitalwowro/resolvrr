import type { ProviderCapability } from "@/core/providers";
import type {
  TicketMetadataMutationInput,
  TicketPriority,
  TicketState,
} from "@/core/tickets";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketMetadataMutationField = "state" | "priority";

export type SelectedTicketUpdateMetadataPayload = {
  pendingUntil?: string;
  priority?: TicketPriority;
  state?: TicketState;
};

export type SelectedTicketUpdatePayload = {
  metadata?: SelectedTicketUpdateMetadataPayload;
  ticketExternalId: string;
};

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

function isPendingState(state: TicketState | undefined): boolean {
  return state === "pending_reminder" || state === "pending_close";
}

export function invalidTicketMetadataMutationInput(
  input: TicketMetadataMutationInput,
  now = new Date(),
): boolean {
  if (input.pendingUntil && (!input.state || !isPendingState(input.state))) {
    return true;
  }
  if (input.state && isPendingState(input.state)) {
    const pendingUntilTime = input.pendingUntil?.getTime() ?? Number.NaN;
    return !Number.isFinite(pendingUntilTime) || pendingUntilTime <= now.getTime();
  }

  return false;
}

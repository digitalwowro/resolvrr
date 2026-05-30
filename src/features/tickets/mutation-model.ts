import type { ProviderCapability } from "@/core/providers";
import type {
  TicketMetadataMutationInput,
  TicketPriority,
  TicketState,
} from "@/core/tickets";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketMetadataMutationField =
  | "state"
  | "priority"
  | "owner"
  | "group";

export const selectedTicketUpdatePayloadKeys = [
  "metadata",
  "ticketExternalId",
] as const;

export const selectedTicketUpdateMetadataFields = [
  "groupExternalId",
  "ownerExternalId",
  "pendingUntil",
  "priority",
  "state",
] as const;

export type SelectedTicketUpdatePayloadKey =
  (typeof selectedTicketUpdatePayloadKeys)[number];

export type SelectedTicketUpdateMetadataField =
  (typeof selectedTicketUpdateMetadataFields)[number];

export type SelectedTicketUpdateMetadataPayload = {
  groupExternalId?: string;
  ownerExternalId?: string;
  pendingUntil?: string;
  priority?: TicketPriority;
  state?: TicketState;
};

export type SelectedTicketUpdatePayload = {
  metadata?: SelectedTicketUpdateMetadataPayload;
  ticketExternalId: string;
};

export type TicketMetadataMutationCapabilities = {
  group?: boolean;
  owner?: boolean;
  priority: boolean;
  state: boolean;
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
  group: false,
  owner: false,
  state: false,
  priority: false,
};

export function ticketMetadataMutationCapabilities(
  capabilities: ProviderCapability[],
): TicketMetadataMutationCapabilities {
  return {
    group: capabilities.includes("ticket:update-group"),
    owner: capabilities.includes("ticket:update-owner"),
    state: capabilities.includes("ticket:update-state"),
    priority: capabilities.includes("ticket:update-priority"),
  };
}

export function hasTicketMetadataMutationInput(
  input: TicketMetadataMutationInput,
): boolean {
  return Boolean(
    input.state ||
      input.priority ||
      input.ownerExternalId ||
      input.groupExternalId,
  );
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

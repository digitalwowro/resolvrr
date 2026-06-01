import type { ProviderCapability } from "@/core/providers";
import type {
  TicketCommunicationBodyFormat,
  TicketLinkRelationKind,
  TicketMetadataMutationInput,
  TicketPriority,
  TicketState,
} from "@/core/tickets";
import type { TicketReadUnavailableReason } from "./read-model";

export type TicketMetadataMutationField =
  | "communication"
  | "state"
  | "priority"
  | "owner"
  | "group"
  | "tags"
  | "links"
  | "subscription";

export const selectedTicketUpdatePayloadKeys = [
  "communication",
  "metadata",
  "ticketExternalId",
] as const;

export const selectedTicketUpdateCommunicationFields = [
  "bodyFormat",
  "commentBody",
  "replyBody",
] as const;

export const selectedTicketUpdateMetadataFields = [
  "groupExternalId",
  "linkAddExternalId",
  "linkAddRelation",
  "linkRemoveExternalIds",
  "ownerExternalId",
  "pendingUntil",
  "priority",
  "state",
  "subscriptionFollowing",
  "tags",
] as const;

export type SelectedTicketUpdatePayloadKey =
  (typeof selectedTicketUpdatePayloadKeys)[number];

export type SelectedTicketUpdateMetadataField =
  (typeof selectedTicketUpdateMetadataFields)[number];

export type SelectedTicketUpdateCommunicationField =
  (typeof selectedTicketUpdateCommunicationFields)[number];

export type SelectedTicketUpdateCommunicationPayload = {
  bodyFormat?: TicketCommunicationBodyFormat;
  commentBody?: string;
  replyBody?: string;
};

export type SelectedTicketUpdateMetadataPayload = {
  groupExternalId?: string;
  linkAddExternalId?: string;
  linkAddRelation?: TicketLinkRelationKind;
  linkRemoveExternalIds?: string[];
  ownerExternalId?: string;
  pendingUntil?: string;
  priority?: TicketPriority;
  state?: TicketState;
  subscriptionFollowing?: boolean;
  tags?: string[];
};

export type SelectedTicketUpdatePayload = {
  communication?: SelectedTicketUpdateCommunicationPayload;
  metadata?: SelectedTicketUpdateMetadataPayload;
  ticketExternalId: string;
};

export type TicketMetadataMutationCapabilities = {
  group?: boolean;
  links?: boolean;
  linkRelations?: boolean;
  owner?: boolean;
  priority: boolean;
  state: boolean;
  subscription?: boolean;
  tags?: boolean;
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
  links: false,
  linkRelations: false,
  owner: false,
  state: false,
  subscription: false,
  tags: false,
  priority: false,
};

export function ticketMetadataMutationCapabilities(
  capabilities: ProviderCapability[],
): TicketMetadataMutationCapabilities {
  return {
    group: capabilities.includes("ticket:update-group"),
    links: capabilities.includes("ticket:update-links"),
    linkRelations: capabilities.includes("ticket:update-link-relations"),
    owner: capabilities.includes("ticket:update-owner"),
    state: capabilities.includes("ticket:update-state"),
    subscription: capabilities.includes("ticket:update-subscription"),
    tags: capabilities.includes("ticket:update-tags"),
    priority: capabilities.includes("ticket:update-priority"),
  };
}

function hasOwnValue(record: object, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, name);
}

export function hasTicketMetadataMutationInput(
  input: TicketMetadataMutationInput,
): boolean {
  return Boolean(
    input.state ||
      input.priority ||
      input.ownerExternalId ||
      input.groupExternalId ||
      hasOwnValue(input, "tags") ||
      input.linkAddExternalId ||
      (input.linkRemoveExternalIds && input.linkRemoveExternalIds.length > 0) ||
      hasOwnValue(input, "subscriptionFollowing"),
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

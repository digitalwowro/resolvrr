import type { TicketMetadataMutationInput, TicketState } from "@/core/tickets";
import {
  selectedTicketUpdateMetadataFields,
  selectedTicketUpdatePayloadKeys,
  type TicketMetadataMutationField,
  type SelectedTicketUpdateCommunicationPayload,
} from "./mutation-model";
import { selectedTicketCommunicationInput } from "./update-communication-action-input";
import {
  booleanValue,
  hasOwnValue,
  hasUnsupportedKeys,
  isTicketLinkRelationKind,
  isTicketPriority,
  isTicketState,
  normalizedTags,
  objectValue,
  stringArrayValue,
  textValue,
} from "./metadata-action-input-values";

export type TicketMetadataMutationActionInput =
  | {
      field: TicketMetadataMutationField;
      communication?: SelectedTicketUpdateCommunicationPayload;
      input: TicketMetadataMutationInput;
      status: "valid";
      ticketExternalId: string;
    }
  | {
      field: TicketMetadataMutationField;
      status: "invalid";
    };

function isPendingState(state: TicketState | undefined): boolean {
  return state === "pending_reminder" || state === "pending_close";
}

function pendingUntilValue(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : undefined;
}

function invalidField(
  hasCommunication: boolean,
  groupExternalId: string,
  linkAddExternalId: string,
  linkRemoveExternalIds: string[] | undefined,
  ownerExternalId: string,
  subscriptionFollowing: boolean | undefined,
  stateValue: string,
  tags: string[] | undefined,
  priorityValue: string,
): TicketMetadataMutationField {
  if (ownerExternalId) {
    return "owner";
  }
  if (groupExternalId) {
    return "group";
  }
  if (tags) {
    return "tags";
  }
  if (linkAddExternalId || linkRemoveExternalIds) {
    return "links";
  }
  if (subscriptionFollowing !== undefined) {
    return "subscription";
  }
  if (hasCommunication) {
    return "communication";
  }
  return stateValue || !priorityValue ? "state" : "priority";
}

export function ticketMetadataMutationActionInput(
  request: unknown,
  now = new Date(),
): TicketMetadataMutationActionInput {
  const requestRecord = objectValue(request);
  if (
    !requestRecord ||
    hasUnsupportedKeys(requestRecord, selectedTicketUpdatePayloadKeys)
  ) {
    return { status: "invalid", field: "state" };
  }
  const communicationInput = selectedTicketCommunicationInput(
    requestRecord.communication,
  );
  if (communicationInput.status === "invalid") {
    return { status: "invalid", field: "communication" };
  }
  const metadata = objectValue(requestRecord?.metadata) ?? {};
  if (hasUnsupportedKeys(metadata, selectedTicketUpdateMetadataFields)) {
    return { status: "invalid", field: "state" };
  }
  const ticketExternalId = textValue(requestRecord, "ticketExternalId");
  const parsedCommunication = communicationInput.status === "valid"
    ? communicationInput.communication
    : undefined;
  const groupExternalId = textValue(metadata, "groupExternalId");
  const linkAddExternalId = textValue(metadata, "linkAddExternalId").trim().replace(
    /^#/u,
    "",
  );
  const linkAddRelation = textValue(metadata, "linkAddRelation");
  const linkRemoveExternalIds = stringArrayValue(metadata, "linkRemoveExternalIds");
  const ownerExternalId = textValue(metadata, "ownerExternalId");
  const stateValue = textValue(metadata, "state");
  const subscriptionFollowing = booleanValue(metadata, "subscriptionFollowing");
  const tags = stringArrayValue(metadata, "tags");
  const priorityValue = textValue(metadata, "priority");
  const pendingUntilText = textValue(metadata, "pendingUntil");
  const input: TicketMetadataMutationInput = {};
  let field: TicketMetadataMutationField | undefined;

  if (parsedCommunication) {
    field = "communication";
  }

  if (hasOwnValue(metadata, "ownerExternalId") && !ownerExternalId) {
    return { status: "invalid", field: "owner" };
  }
  if (ownerExternalId) {
    input.ownerExternalId = ownerExternalId;
    field = "owner";
  }

  if (hasOwnValue(metadata, "groupExternalId") && !groupExternalId) {
    return { status: "invalid", field: "group" };
  }
  if (groupExternalId) {
    input.groupExternalId = groupExternalId;
    field = field ?? "group";
  }

  if (hasOwnValue(metadata, "tags") && !tags) {
    return { status: "invalid", field: "tags" };
  }
  if (tags) {
    input.tags = normalizedTags(tags);
    field = field ?? "tags";
  }

  if (hasOwnValue(metadata, "linkAddExternalId") && !linkAddExternalId) {
    return { status: "invalid", field: "links" };
  }
  if (linkAddExternalId) {
    input.linkAddExternalId = linkAddExternalId;
    field = field ?? "links";
  }
  if (hasOwnValue(metadata, "linkAddRelation")) {
    if (!linkAddExternalId || !isTicketLinkRelationKind(linkAddRelation)) {
      return { status: "invalid", field: "links" };
    }
    input.linkAddRelation = linkAddRelation;
    field = field ?? "links";
  } else if (linkAddExternalId) {
    input.linkAddRelation = "related";
  }

  if (hasOwnValue(metadata, "linkRemoveExternalIds")) {
    if (
      !linkRemoveExternalIds ||
      linkRemoveExternalIds.some((externalId) => !externalId.trim())
    ) {
      return { status: "invalid", field: "links" };
    }
    input.linkRemoveExternalIds = linkRemoveExternalIds.map((externalId) =>
      externalId.trim().replace(/^#/u, ""),
    );
    field = field ?? "links";
  }

  if (
    hasOwnValue(metadata, "subscriptionFollowing") &&
    subscriptionFollowing === undefined
  ) {
    return { status: "invalid", field: "subscription" };
  }
  if (subscriptionFollowing !== undefined) {
    input.subscriptionFollowing = subscriptionFollowing;
    field = field ?? "subscription";
  }

  if (hasOwnValue(metadata, "state") && !stateValue) {
    return { status: "invalid", field: "state" };
  }
  if (stateValue) {
    if (!isTicketState(stateValue)) {
      return { status: "invalid", field: "state" };
    }
    input.state = stateValue;
    field = "state";
  }

  if (hasOwnValue(metadata, "priority") && !priorityValue) {
    return { status: "invalid", field: "priority" };
  }
  if (priorityValue) {
    if (!isTicketPriority(priorityValue)) {
      return { status: "invalid", field: "priority" };
    }
    input.priority = priorityValue;
    field = field ?? "priority";
  }

  if (hasOwnValue(metadata, "pendingUntil") && !pendingUntilText) {
    return { status: "invalid", field: "state" };
  }
  if (pendingUntilText) {
    const pendingUntil = pendingUntilValue(pendingUntilText);
    if (
      !input.state ||
      !isPendingState(input.state) ||
      !pendingUntil ||
      pendingUntil.getTime() <= now.getTime()
    ) {
      return { status: "invalid", field: "state" };
    }
    input.pendingUntil = pendingUntil;
  }

  if (input.state && isPendingState(input.state) && !input.pendingUntil) {
    return { status: "invalid", field: "state" };
  }

  if (!ticketExternalId || !field) {
    return {
      status: "invalid",
      field: invalidField(
        Boolean(parsedCommunication),
        groupExternalId,
        linkAddExternalId,
        linkRemoveExternalIds,
        ownerExternalId,
        subscriptionFollowing,
        stateValue,
        tags,
        priorityValue,
      ),
    };
  }

  return {
    ...(parsedCommunication ? { communication: parsedCommunication } : {}),
    field,
    input,
    status: "valid",
    ticketExternalId,
  };
}

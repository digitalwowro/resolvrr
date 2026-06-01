import {
  ticketLinkRelationKinds,
  ticketPriorities,
  ticketStates,
  type TicketCommunicationBodyFormat,
  type TicketLinkRelationKind,
  type TicketMetadataMutationInput,
  type TicketPriority,
  type TicketState,
} from "@/core/tickets";
import {
  isTicketCommunicationBodyFormat,
  normalizedCommunicationBody,
} from "./communication-body";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import {
  selectedTicketUpdateCommunicationFields,
  selectedTicketUpdateMetadataFields,
  selectedTicketUpdatePayloadKeys,
  type TicketMetadataMutationField,
} from "./mutation-model";

export type TicketMetadataMutationActionInput =
  | {
      field: TicketMetadataMutationField;
      bodyFormat: TicketCommunicationBodyFormat;
      commentBody?: string;
      input: TicketMetadataMutationInput;
      replyBody?: string;
      status: "valid";
      ticketExternalId: string;
    }
  | {
      field: TicketMetadataMutationField;
      status: "invalid";
    };

function objectValue(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function textValue(record: Record<string, unknown>, name: string): string {
  const value = record[name];
  return typeof value === "string" ? value : "";
}

function booleanValue(
  record: Record<string, unknown>,
  name: string,
): boolean | undefined {
  const value = record[name];
  return typeof value === "boolean" ? value : undefined;
}

function stringArrayValue(
  record: Record<string, unknown>,
  name: string,
): string[] | undefined {
  const value = record[name];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : undefined;
}

function hasOwnValue(record: Record<string, unknown>, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, name);
}

function hasUnsupportedKeys(
  record: Record<string, unknown>,
  allowedKeys: readonly string[],
): boolean {
  return Object.keys(record).some((key) => !allowedKeys.includes(key));
}

function isTicketState(value: string): value is TicketState {
  return ticketStates.includes(value as TicketState);
}

function isTicketPriority(value: string): value is TicketPriority {
  return ticketPriorities.includes(value as TicketPriority);
}

function isTicketLinkRelationKind(value: string): value is TicketLinkRelationKind {
  return ticketLinkRelationKinds.includes(value as TicketLinkRelationKind);
}

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
  bodyFormat: string,
  commentBody: string,
  groupExternalId: string,
  linkAddExternalId: string,
  linkRemoveExternalIds: string[] | undefined,
  ownerExternalId: string,
  replyBody: string,
  subscriptionFollowing: boolean | undefined,
  stateValue: string,
  tags: string[] | undefined,
  priorityValue: string,
): TicketMetadataMutationField {
  if (bodyFormat && !isTicketCommunicationBodyFormat(bodyFormat)) {
    return "communication";
  }
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
  if (commentBody || replyBody) {
    return "communication";
  }
  return stateValue || !priorityValue ? "state" : "priority";
}

function normalizedTags(values: string[]): string[] {
  return [
    ...new Set(
      values
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
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
  const communication = objectValue(requestRecord?.communication) ?? {};
  if (hasUnsupportedKeys(communication, selectedTicketUpdateCommunicationFields)) {
    return { status: "invalid", field: "communication" };
  }
  const metadata = objectValue(requestRecord?.metadata) ?? {};
  if (hasUnsupportedKeys(metadata, selectedTicketUpdateMetadataFields)) {
    return { status: "invalid", field: "state" };
  }
  const ticketExternalId = textValue(requestRecord, "ticketExternalId");
  const bodyFormatValue = textValue(communication, "bodyFormat");
  if (
    hasOwnValue(communication, "bodyFormat") &&
    !isTicketCommunicationBodyFormat(bodyFormatValue)
  ) {
    return { status: "invalid", field: "communication" };
  }
  const bodyFormat: TicketCommunicationBodyFormat =
    bodyFormatValue === "html" ? "html" : "plain";
  const rawCommentBody = textValue(communication, "commentBody");
  const commentBody = normalizedCommunicationBody(
    bodyFormat === "html" ? sanitizeComposerHtml(rawCommentBody) : rawCommentBody,
  );
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
  const rawReplyBody = textValue(communication, "replyBody");
  const replyBody = normalizedCommunicationBody(
    bodyFormat === "html" ? sanitizeComposerHtml(rawReplyBody) : rawReplyBody,
  );
  const pendingUntilText = textValue(metadata, "pendingUntil");
  const input: TicketMetadataMutationInput = {};
  let field: TicketMetadataMutationField | undefined;

  if (hasOwnValue(communication, "commentBody") && !commentBody) {
    return { status: "invalid", field: "communication" };
  }
  if (commentBody) {
    field = "communication";
  }

  if (hasOwnValue(communication, "replyBody") && !replyBody) {
    return { status: "invalid", field: "communication" };
  }
  if (replyBody) {
    field = field ?? "communication";
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
        bodyFormatValue,
        commentBody,
        groupExternalId,
        linkAddExternalId,
        linkRemoveExternalIds,
        ownerExternalId,
        replyBody,
        subscriptionFollowing,
        stateValue,
        tags,
        priorityValue,
      ),
    };
  }

  return {
    bodyFormat,
    ...(commentBody ? { commentBody } : {}),
    field,
    input,
    ...(replyBody ? { replyBody } : {}),
    status: "valid",
    ticketExternalId,
  };
}

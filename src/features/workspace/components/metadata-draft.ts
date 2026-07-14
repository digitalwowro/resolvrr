import type { TicketMutableState } from "@/core/tickets";
import { normalizedReplyRecipients } from "@/features/tickets/reply-input";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import {
  isFuturePendingDateTime,
  pendingDateTimeIso,
  pendingDateTimePartsFromIso,
  type PendingDateTimeParts,
} from "./ticket-pending-date-time";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
  TicketMetadataDraftValidation,
} from "./metadata-draft-types";
import { communicationDraftBody, copyCommunicationDraft } from "./communication-draft";
export * from "./metadata-draft-types";
export { communicationDraftNeedsReplacementConfirmation } from "./communication-draft";
export { metadataDraftUpdatePayload } from "./metadata-draft-payload";

function isPendingState(state: TicketMutableState | undefined): boolean {
  return state === "pending_reminder" || state === "pending_close";
}

function normalizedPendingIso(value: PendingDateTimeParts): string | undefined {
  return pendingDateTimeIso(value);
}

export function metadataDraftFromDetail(
  detail: WorkspaceTicketDetail,
): SelectedTicketDraft {
  return {
    metadata: {
      groupExternalId: detail.groupExternalId,
      linkAddExternalId: "",
      linkAddRelation: "related",
      linkRemoveExternalIds: [],
      ownerExternalId: detail.ownerExternalId,
      pendingDateTime: pendingDateTimePartsFromIso(detail.pendingUntilIso),
      priority: detail.priorityKey,
      state: detail.stateKey,
      subscriptionFollowing: detail.subscription.supported
        ? detail.subscription.following
        : undefined,
      tagText: detail.tags.join(", "),
      tags: [...detail.tags],
    },
    ticketExternalId: detail.id,
  };
}

export function metadataDraftFromBaseline(
  baseline: SelectedTicketDraft,
): SelectedTicketDraft {
  return {
    communication: copyCommunicationDraft(baseline.communication),
    metadata: {
      groupExternalId: baseline.metadata.groupExternalId,
      linkAddExternalId: baseline.metadata.linkAddExternalId,
      linkAddRelation: baseline.metadata.linkAddRelation,
      linkRemoveExternalIds: [...baseline.metadata.linkRemoveExternalIds],
      ownerExternalId: baseline.metadata.ownerExternalId,
      pendingDateTime: { ...baseline.metadata.pendingDateTime },
      priority: baseline.metadata.priority,
      state: baseline.metadata.state,
      subscriptionFollowing: baseline.metadata.subscriptionFollowing,
      tagText: baseline.metadata.tagText,
      tags: [...baseline.metadata.tags],
    },
    ticketExternalId: baseline.ticketExternalId,
  };
}

export function metadataDraftKey(draft: SelectedTicketDraft): string {
  return [
    draft.ticketExternalId,
    draft.communication?.kind ?? "",
    communicationDraftBody(draft.communication),
    draft.communication?.kind === "customer-reply"
      ? [
          draft.communication.sourceArticleExternalId,
          draft.communication.intent,
          draft.communication.to.join(","),
          draft.communication.cc.join(","),
        ].join(":")
      : "",
    draft.communication?.kind === "customer-forward"
      ? [
          draft.communication.sourceArticleExternalId,
          draft.communication.subject,
          draft.communication.to.join(","),
          draft.communication.cc.join(","),
          draft.communication.attachmentExternalIds.join(","),
          String(draft.communication.includeOriginal),
        ].join(":")
      : "",
    draft.metadata.ownerExternalId ?? "",
    draft.metadata.groupExternalId ?? "",
    draft.metadata.tags.join(","),
    draft.metadata.linkAddExternalId ?? "",
    draft.metadata.linkAddRelation,
    draft.metadata.linkRemoveExternalIds.join(","),
    draft.metadata.subscriptionFollowing === undefined
      ? ""
      : String(draft.metadata.subscriptionFollowing),
    draft.metadata.state ?? "",
    draft.metadata.priority ?? "",
    normalizedPendingIso(draft.metadata.pendingDateTime) ?? "",
  ].join("|");
}

export function metadataDraftDirtyFields(
  baseline: SelectedTicketDraft,
  draft: SelectedTicketDraft,
): TicketMetadataDraftDirtyFields {
  const state = draft.metadata.state !== baseline.metadata.state;
  const priority = draft.metadata.priority !== baseline.metadata.priority;
  const owner =
    draft.metadata.ownerExternalId !== baseline.metadata.ownerExternalId;
  const group =
    draft.metadata.groupExternalId !== baseline.metadata.groupExternalId;
  const tags = !sameStringList(draft.metadata.tags, baseline.metadata.tags);
  const links = Boolean(
    draft.metadata.linkAddExternalId ||
      draft.metadata.linkRemoveExternalIds.length > 0,
  );
  const subscription =
    draft.metadata.subscriptionFollowing !==
    baseline.metadata.subscriptionFollowing;
  const communication = Boolean(
    communicationDraftBody(draft.communication) ||
    (draft.communication?.kind === "customer-forward" && (
      draft.communication.to.length + draft.communication.cc.length > 0
    )),
  );
  const pendingUntil =
    isPendingState(draft.metadata.state) &&
    normalizedPendingIso(draft.metadata.pendingDateTime) !==
      normalizedPendingIso(baseline.metadata.pendingDateTime);
  const pendingInputChanged =
    isPendingState(draft.metadata.state) && (state || pendingUntil);

  return {
    communication,
    pendingDate: pendingInputChanged,
    pendingTime: pendingInputChanged,
    pendingUntil,
    group,
    links,
    owner,
    priority,
    state,
    subscription,
    tags,
  };
}

function sameStringList(left: string[], right: string[]): boolean {
  return (
    left.length === right.length &&
    left.every((value, index) => value === right[index])
  );
}

export function metadataDraftHasChanges(
  dirtyFields: TicketMetadataDraftDirtyFields,
): boolean {
  return (
    dirtyFields.state ||
    dirtyFields.priority ||
    dirtyFields.pendingUntil ||
    dirtyFields.owner ||
    dirtyFields.group ||
    dirtyFields.tags ||
    dirtyFields.links ||
    dirtyFields.subscription ||
    dirtyFields.communication
  );
}

export function metadataDraftRequiresPendingDate(
  detail: WorkspaceTicketDetail,
  draft: SelectedTicketDraft,
): boolean {
  return Boolean(
    draft.metadata.state &&
      detail.metadataMutationConstraints?.pendingDateRequiredStates?.[
        draft.metadata.state
      ],
  );
}

export function validateMetadataDraft(
  detail: WorkspaceTicketDetail,
  dirtyFields: TicketMetadataDraftDirtyFields,
  draft: SelectedTicketDraft,
): TicketMetadataDraftValidation {
  if (
    dirtyFields.communication &&
    draft.communication?.kind !== "internal-comment" &&
    draft.communication &&
    !normalizedReplyRecipients(draft.communication.to, draft.communication.cc)
  ) {
    return {
      message: "Add at least one valid To or Cc recipient.",
      valid: false,
    };
  }
  if (
    dirtyFields.communication && draft.communication?.kind === "customer-forward" &&
    (!draft.communication.subject.trim() || /[\r\n\0]/u.test(draft.communication.subject))
  ) {
    return { message: "Add a valid forward subject.", valid: false };
  }
  if (
    dirtyFields.communication && draft.communication?.kind === "customer-forward" &&
    !draft.communication.includeOriginal && !communicationDraftBody(draft.communication)
  ) {
    return { message: "Add a message or include the original email.", valid: false };
  }
  if (
    metadataDraftRequiresPendingDate(detail, draft) &&
    (dirtyFields.state || dirtyFields.pendingUntil) &&
    !isFuturePendingDateTime(draft.metadata.pendingDateTime)
  ) {
    return {
      message: "Choose a future pending date and time.",
      valid: false,
    };
  }

  return { valid: true };
}

export function metadataDraftSubmittedBaseline(
  draft: SelectedTicketDraft,
): SelectedTicketDraft {
  return {
    metadata: {
      ...draft.metadata,
      linkAddExternalId: "",
      linkAddRelation: "related",
      linkRemoveExternalIds: [],
      tagText: draft.metadata.tags.join(", "),
      tags: [...draft.metadata.tags],
    },
    ticketExternalId: draft.ticketExternalId,
  };
}

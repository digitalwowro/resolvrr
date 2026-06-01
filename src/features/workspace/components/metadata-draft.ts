import type {
  TicketLinkRelationKind,
  TicketPriority,
  TicketState,
} from "@/core/tickets";
import { normalizedCommunicationBody } from "@/features/tickets/communication-body";
import type { SelectedTicketUpdatePayload } from "@/features/tickets/mutation-model";
import { sanitizeComposerHtml } from "@/security/sanitize-html";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import {
  isFuturePendingDateTime,
  pendingDateTimeIso,
  pendingDateTimePartsFromIso,
  type PendingDateTimeParts,
} from "./ticket-pending-date-time";

export type TicketMetadataDraft = {
  groupExternalId?: string;
  linkAddExternalId?: string;
  linkAddRelation: TicketLinkRelationKind;
  linkRemoveExternalIds: string[];
  ownerExternalId?: string;
  pendingDateTime: PendingDateTimeParts;
  priority?: TicketPriority;
  state?: TicketState;
  subscriptionFollowing?: boolean;
  tagText: string;
  tags: string[];
};

export type TicketCommunicationDraft = {
  commentBody: string;
  replyBody: string;
};

export const selectedTicketDraftEditableSlices = [
  "metadata",
  "communication",
] as const;

export type SelectedTicketDraftEditableSlice =
  (typeof selectedTicketDraftEditableSlices)[number];

export type SelectedTicketDraft = {
  communication: TicketCommunicationDraft;
  metadata: TicketMetadataDraft;
  ticketExternalId: string;
};

export type TicketMetadataDraftDirtyFields = {
  communication: boolean;
  pendingDate: boolean;
  pendingTime: boolean;
  pendingUntil: boolean;
  group: boolean;
  links: boolean;
  owner: boolean;
  priority: boolean;
  state: boolean;
  subscription: boolean;
  tags: boolean;
};

export type TicketMetadataDraftValidation = {
  message?: string;
  valid: boolean;
};

export type TicketMetadataSavedPatch = {
  group?: string;
  owner?: string;
  priority?: TicketPriority;
  state?: TicketState;
  subscriptionFollowing?: boolean;
  tags?: string[];
  ticketExternalId: string;
};

function isPendingState(state: TicketState | undefined): boolean {
  return state === "pending_reminder" || state === "pending_close";
}

function normalizedPendingIso(value: PendingDateTimeParts): string | undefined {
  return pendingDateTimeIso(value);
}

export function metadataDraftFromDetail(
  detail: WorkspaceTicketDetail,
): SelectedTicketDraft {
  return {
    communication: {
      commentBody: "",
      replyBody: "",
    },
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
    communication: {
      commentBody: baseline.communication.commentBody,
      replyBody: baseline.communication.replyBody,
    },
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
    draft.communication.commentBody,
    draft.communication.replyBody,
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
  const communication =
    Boolean(normalizedCommunicationBody(draft.communication.commentBody)) ||
    Boolean(normalizedCommunicationBody(draft.communication.replyBody));
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

function normalizedDraftCommunicationBody(body: string): string {
  return normalizedCommunicationBody(sanitizeComposerHtml(body));
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
    communication: {
      commentBody: "",
      replyBody: "",
    },
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

export function metadataDraftUpdatePayload(
  baseline: SelectedTicketDraft,
  draft: SelectedTicketDraft,
): SelectedTicketUpdatePayload | undefined {
  const dirtyFields = metadataDraftDirtyFields(baseline, draft);
  if (!metadataDraftHasChanges(dirtyFields)) {
    return undefined;
  }

  const metadata: NonNullable<SelectedTicketUpdatePayload["metadata"]> = {};
  const communication: NonNullable<SelectedTicketUpdatePayload["communication"]> =
    {};
  if (dirtyFields.state || dirtyFields.pendingUntil) {
    if (!draft.metadata.state) {
      return undefined;
    }
    metadata.state = draft.metadata.state;
    if (isPendingState(draft.metadata.state)) {
      const pendingUntil = pendingDateTimeIso(draft.metadata.pendingDateTime);
      if (!pendingUntil) {
        return undefined;
      }
      metadata.pendingUntil = pendingUntil;
    }
  }
  if (dirtyFields.priority) {
    if (!draft.metadata.priority) {
      return undefined;
    }
    metadata.priority = draft.metadata.priority;
  }
  if (dirtyFields.owner) {
    if (!draft.metadata.ownerExternalId) {
      return undefined;
    }
    metadata.ownerExternalId = draft.metadata.ownerExternalId;
  }
  if (dirtyFields.group) {
    if (!draft.metadata.groupExternalId) {
      return undefined;
    }
    metadata.groupExternalId = draft.metadata.groupExternalId;
  }
  if (dirtyFields.tags) {
    metadata.tags = draft.metadata.tags;
  }
  if (dirtyFields.links) {
    if (draft.metadata.linkAddExternalId) {
      metadata.linkAddExternalId = draft.metadata.linkAddExternalId;
      metadata.linkAddRelation = draft.metadata.linkAddRelation;
    }
    if (draft.metadata.linkRemoveExternalIds.length > 0) {
      metadata.linkRemoveExternalIds = draft.metadata.linkRemoveExternalIds;
    }
  }
  if (dirtyFields.subscription) {
    if (draft.metadata.subscriptionFollowing === undefined) {
      return undefined;
    }
    metadata.subscriptionFollowing = draft.metadata.subscriptionFollowing;
  }
  if (dirtyFields.communication) {
    const commentBody = normalizedDraftCommunicationBody(
      draft.communication.commentBody,
    );
    const replyBody = normalizedDraftCommunicationBody(draft.communication.replyBody);
    communication.bodyFormat = "html";
    if (commentBody) {
      communication.commentBody = commentBody;
    }
    if (replyBody) {
      communication.replyBody = replyBody;
    }
  }

  return {
    ...(Object.keys(communication).length > 0 ? { communication } : {}),
    ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
    ticketExternalId: draft.ticketExternalId,
  };
}

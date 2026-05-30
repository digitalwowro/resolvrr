import type { TicketPriority, TicketState } from "@/core/tickets";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import {
  isFuturePendingDateTime,
  pendingDateTimeIso,
  pendingDateTimePartsFromIso,
  type PendingDateTimeParts,
} from "./ticket-pending-date-time";

export type TicketMetadataDraft = {
  pendingDateTime: PendingDateTimeParts;
  priority?: TicketPriority;
  state?: TicketState;
};

export type SelectedTicketDraft = {
  metadata: TicketMetadataDraft;
  ticketExternalId: string;
};

export type TicketMetadataDraftDirtyFields = {
  pendingDate: boolean;
  pendingTime: boolean;
  pendingUntil: boolean;
  priority: boolean;
  state: boolean;
};

export type TicketMetadataDraftValidation = {
  message?: string;
  valid: boolean;
};

export type TicketMetadataSavedPatch = {
  priority?: TicketPriority;
  state?: TicketState;
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
    metadata: {
      pendingDateTime: pendingDateTimePartsFromIso(detail.pendingUntilIso),
      priority: detail.priorityKey,
      state: detail.stateKey,
    },
    ticketExternalId: detail.id,
  };
}

export function metadataDraftFromBaseline(
  baseline: SelectedTicketDraft,
): SelectedTicketDraft {
  return {
    metadata: {
      pendingDateTime: { ...baseline.metadata.pendingDateTime },
      priority: baseline.metadata.priority,
      state: baseline.metadata.state,
    },
    ticketExternalId: baseline.ticketExternalId,
  };
}

export function metadataDraftKey(draft: SelectedTicketDraft): string {
  return [
    draft.ticketExternalId,
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
  const pendingUntil =
    isPendingState(draft.metadata.state) &&
    normalizedPendingIso(draft.metadata.pendingDateTime) !==
      normalizedPendingIso(baseline.metadata.pendingDateTime);
  const pendingInputChanged =
    isPendingState(draft.metadata.state) && (state || pendingUntil);

  return {
    pendingDate: pendingInputChanged,
    pendingTime: pendingInputChanged,
    pendingUntil,
    priority,
    state,
  };
}

export function metadataDraftHasChanges(
  dirtyFields: TicketMetadataDraftDirtyFields,
): boolean {
  return dirtyFields.state || dirtyFields.priority || dirtyFields.pendingUntil;
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
  return metadataDraftFromBaseline(draft);
}

export function metadataDraftFormData(
  baseline: SelectedTicketDraft,
  draft: SelectedTicketDraft,
): FormData | undefined {
  const dirtyFields = metadataDraftDirtyFields(baseline, draft);
  if (!metadataDraftHasChanges(dirtyFields)) {
    return undefined;
  }

  const formData = new FormData();
  formData.set("ticketExternalId", draft.ticketExternalId);
  if (dirtyFields.state || dirtyFields.pendingUntil) {
    if (!draft.metadata.state) {
      return undefined;
    }
    formData.set("state", draft.metadata.state);
    if (isPendingState(draft.metadata.state)) {
      const pendingUntil = pendingDateTimeIso(draft.metadata.pendingDateTime);
      if (!pendingUntil) {
        return undefined;
      }
      formData.set("pendingUntil", pendingUntil);
    }
  }
  if (dirtyFields.priority) {
    if (!draft.metadata.priority) {
      return undefined;
    }
    formData.set("priority", draft.metadata.priority);
  }

  return formData;
}

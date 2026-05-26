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
): TicketMetadataDraft {
  return {
    pendingDateTime: pendingDateTimePartsFromIso(detail.pendingUntilIso),
    priority: detail.priorityKey,
    state: detail.stateKey,
    ticketExternalId: detail.id,
  };
}

export function metadataDraftFromBaseline(
  baseline: TicketMetadataDraft,
): TicketMetadataDraft {
  return {
    pendingDateTime: { ...baseline.pendingDateTime },
    priority: baseline.priority,
    state: baseline.state,
    ticketExternalId: baseline.ticketExternalId,
  };
}

export function metadataDraftKey(draft: TicketMetadataDraft): string {
  return [
    draft.ticketExternalId,
    draft.state ?? "",
    draft.priority ?? "",
    normalizedPendingIso(draft.pendingDateTime) ?? "",
  ].join("|");
}

export function metadataDraftDirtyFields(
  baseline: TicketMetadataDraft,
  draft: TicketMetadataDraft,
): TicketMetadataDraftDirtyFields {
  const state = draft.state !== baseline.state;
  const priority = draft.priority !== baseline.priority;
  const pendingUntil =
    isPendingState(draft.state) &&
    normalizedPendingIso(draft.pendingDateTime) !==
      normalizedPendingIso(baseline.pendingDateTime);
  const pendingInputChanged = isPendingState(draft.state) && (state || pendingUntil);

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
  draft: TicketMetadataDraft,
): boolean {
  return Boolean(
    draft.state &&
      detail.metadataMutationConstraints?.pendingDateRequiredStates?.[draft.state],
  );
}

export function validateMetadataDraft(
  detail: WorkspaceTicketDetail,
  dirtyFields: TicketMetadataDraftDirtyFields,
  draft: TicketMetadataDraft,
): TicketMetadataDraftValidation {
  if (
    metadataDraftRequiresPendingDate(detail, draft) &&
    (dirtyFields.state || dirtyFields.pendingUntil) &&
    !isFuturePendingDateTime(draft.pendingDateTime)
  ) {
    return {
      message: "Choose a future pending date and time.",
      valid: false,
    };
  }

  return { valid: true };
}

export function metadataDraftSubmittedBaseline(
  draft: TicketMetadataDraft,
): TicketMetadataDraft {
  return metadataDraftFromBaseline(draft);
}

export function metadataDraftFormData(
  baseline: TicketMetadataDraft,
  draft: TicketMetadataDraft,
): FormData | undefined {
  const dirtyFields = metadataDraftDirtyFields(baseline, draft);
  if (!metadataDraftHasChanges(dirtyFields)) {
    return undefined;
  }

  const formData = new FormData();
  formData.set("ticketExternalId", draft.ticketExternalId);
  if (dirtyFields.state || dirtyFields.pendingUntil) {
    if (!draft.state) {
      return undefined;
    }
    formData.set("state", draft.state);
    if (isPendingState(draft.state)) {
      const pendingUntil = pendingDateTimeIso(draft.pendingDateTime);
      if (!pendingUntil) {
        return undefined;
      }
      formData.set("pendingUntil", pendingUntil);
    }
  }
  if (dirtyFields.priority) {
    if (!draft.priority) {
      return undefined;
    }
    formData.set("priority", draft.priority);
  }

  return formData;
}

import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
} from "@/features/tickets/mutation-model";
import {
  metadataDraftDirtyFields,
  metadataDraftFromBaseline,
  type SelectedTicketDraft,
} from "./metadata-draft";

export function noopMetadataSavedDetailRefresh() {}

export function mutationStatusText(
  saving: boolean,
  result: TicketMetadataMutationActionState,
) {
  if (saving) {
    return undefined;
  }
  if (
    result.status === "failed" ||
    result.status === "saved-refresh-failed" ||
    result.status === "partially-saved"
  ) {
    return result.message;
  }
  return undefined;
}

export function actionErrorState(): TicketMetadataMutationActionState {
  return {
    status: "failed",
    message: "The ticket could not be updated. Try again.",
  };
}

export function updatePayloadNeedsDetailRefresh(
  payload: SelectedTicketUpdatePayload,
) {
  return Boolean(
    payload.communication ||
      payload.metadata?.linkAddExternalId ||
      payload.metadata?.linkRemoveExternalIds?.length,
  );
}

export function mergeRefreshedDraft({
  currentBaseline,
  currentDraft,
  nextBaseline,
}: {
  currentBaseline: SelectedTicketDraft;
  currentDraft: SelectedTicketDraft;
  nextBaseline: SelectedTicketDraft;
}): SelectedTicketDraft {
  const dirtyFields = metadataDraftDirtyFields(currentBaseline, currentDraft);
  const nextDraft = metadataDraftFromBaseline(nextBaseline);

  return {
    ...nextDraft,
    communication: currentDraft.communication,
    metadata: {
      ...nextDraft.metadata,
      ...(dirtyFields.group
        ? { groupExternalId: currentDraft.metadata.groupExternalId }
        : {}),
      ...(dirtyFields.links
        ? {
            linkAddExternalId: currentDraft.metadata.linkAddExternalId,
            linkAddRelation: currentDraft.metadata.linkAddRelation,
            linkRemoveExternalIds: [
              ...currentDraft.metadata.linkRemoveExternalIds,
            ],
          }
        : {}),
      ...(dirtyFields.owner
        ? { ownerExternalId: currentDraft.metadata.ownerExternalId }
        : {}),
      ...(dirtyFields.pendingUntil || dirtyFields.state
        ? { pendingDateTime: { ...currentDraft.metadata.pendingDateTime } }
        : {}),
      ...(dirtyFields.priority
        ? { priority: currentDraft.metadata.priority }
        : {}),
      ...(dirtyFields.state ? { state: currentDraft.metadata.state } : {}),
      ...(dirtyFields.subscription
        ? {
            subscriptionFollowing:
              currentDraft.metadata.subscriptionFollowing,
          }
        : {}),
      ...(dirtyFields.tags
        ? {
            tagText: currentDraft.metadata.tagText,
            tags: [...currentDraft.metadata.tags],
          }
        : {}),
    },
  };
}

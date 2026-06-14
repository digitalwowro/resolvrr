"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { TicketMetadataMutationActionState } from "@/features/tickets/mutation-model";
import {
  metadataDraftDirtyFields,
  metadataDraftFromBaseline,
  metadataDraftHasChanges,
  metadataDraftSubmittedBaseline,
  metadataDraftUpdatePayload,
  validateMetadataDraft,
  type SelectedTicketDraft,
} from "./metadata-draft";
import {
  actionErrorState,
  mergeRefreshedDraft,
  mutationStatusText,
  noopMetadataSavedDetailRefresh,
  updatePayloadNeedsDetailRefresh,
} from "./ticket-metadata-editor-submit";
import {
  shouldReturnToListAfterUpdate,
  type PostUpdateNavigation,
} from "./post-update-navigation";
import {
  assignmentLabel,
  TicketAssignmentFields,
} from "./ticket-assignment-fields";
import { TicketMetadataActionBar } from "./ticket-metadata-action-bar";
import { TicketDetailSidebar } from "./ticket-detail-sidebar";
import { TicketPrimaryMetadataFields } from "./ticket-primary-metadata-fields";
import { TicketSecondaryMetadataFields } from "./ticket-secondary-metadata-fields";
import { TicketThread } from "./ticket-thread";
import {
  clearPersistedCommunicationDrafts,
  type CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-persistence";
import type { TicketMetadataEditorStateProps } from "./ticket-metadata-editor-state-types";

export function TicketMetadataEditorState({
  communicationCapabilities,
  detail,
  header,
  loadedBaseline,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  recentlyViewedLinkTargets,
  rewriteDraftAction,
  searchTicketLinkTargetsAction,
  updateTicketMetadataAction,
  userId,
  workspaceId,
}: TicketMetadataEditorStateProps) {
  const router = useRouter();
  const refreshSavedDetail =
    onMetadataSavedDetailRefresh ?? noopMetadataSavedDetailRefresh;
  const [renderedBaseline, setRenderedBaseline] =
    useState<SelectedTicketDraft>(loadedBaseline);
  const [baseline, setBaseline] = useState<SelectedTicketDraft>(loadedBaseline);
  const [draft, setDraft] = useState<SelectedTicketDraft>(
    metadataDraftFromBaseline(loadedBaseline),
  );
  const [saving, setSaving] = useState(false);
  const [mutationResult, setMutationResult] =
    useState<TicketMetadataMutationActionState>({ status: "idle" });
  const [threadComposerResetKey, setThreadComposerResetKey] = useState(0);
  const [scrollAfterArticleCount, setScrollAfterArticleCount] =
    useState<number>();

  let currentBaseline = baseline;
  let currentDraft = draft;
  if (renderedBaseline !== loadedBaseline) {
    const nextDraft = mergeRefreshedDraft({
      currentBaseline: baseline,
      currentDraft: draft,
      nextBaseline: loadedBaseline,
    });
    setRenderedBaseline(loadedBaseline);
    setBaseline(loadedBaseline);
    setDraft(nextDraft);
    currentBaseline = loadedBaseline;
    currentDraft = nextDraft;
  }

  const dirtyFields = metadataDraftDirtyFields(currentBaseline, currentDraft);
  const hasChanges = metadataDraftHasChanges(dirtyFields);
  const validation = validateMetadataDraft(detail, dirtyFields, currentDraft);
  const statusText = mutationStatusText(saving, mutationResult);
  const canUpdate = hasChanges && validation.valid && !saving;
  const draftPersistenceScope = useMemo<
    CommunicationDraftPersistenceScope | undefined
  >(
    () =>
      userId && workspaceId
        ? {
            ticketExternalId: detail.id,
            userId,
            workspaceId,
          }
        : undefined,
    [detail.id, userId, workspaceId],
  );

  function changeDraft(nextDraft: SelectedTicketDraft) {
    setDraft(nextDraft);
    setMutationResult({ status: "idle" });
  }

  function discardChanges() {
    const nextDraft = metadataDraftFromBaseline(currentBaseline);
    setDraft(nextDraft);
    setMutationResult({ status: "idle" });
    void clearPersistedCommunicationDrafts(draftPersistenceScope);
  }

  function submitChanges(navigation: PostUpdateNavigation) {
    if (!canUpdate) {
      return;
    }

    const updatePayload = metadataDraftUpdatePayload(currentBaseline, currentDraft);
    if (!updatePayload) {
      return;
    }
    const submittedCommunication = Boolean(
      updatePayload.communication?.commentBody ||
        updatePayload.communication?.replyBody,
    );
    const submittedArticleCount = detail.articles.length;

    setSaving(true);
    setMutationResult({ status: "idle" });

    void updateTicketMetadataAction(updatePayload)
      .then((result) => {
        setMutationResult(result);
        if (
          result.status === "saved" ||
          result.status === "saved-refresh-failed"
        ) {
          const submittedBaseline = metadataDraftSubmittedBaseline(currentDraft);
          onMetadataSaved({
            group: dirtyFields.group
              ? assignmentLabel(
                  detail.lookupData.groups,
                  submittedBaseline.metadata.groupExternalId,
                  detail.group,
                )
              : undefined,
            owner: dirtyFields.owner
              ? assignmentLabel(
                  detail.lookupData.assignableUsers,
                  submittedBaseline.metadata.ownerExternalId,
                  detail.owner,
                )
              : undefined,
            priority: dirtyFields.priority
              ? submittedBaseline.metadata.priority
              : undefined,
            state: dirtyFields.state || dirtyFields.pendingUntil
              ? submittedBaseline.metadata.state
              : undefined,
            ticketExternalId: submittedBaseline.ticketExternalId,
          });
          if (result.status === "saved") {
            if (submittedCommunication) {
              setScrollAfterArticleCount(submittedArticleCount);
            }
            if (updatePayloadNeedsDetailRefresh(updatePayload)) {
              refreshSavedDetail(submittedBaseline.ticketExternalId);
            }
          }
          if (submittedCommunication) {
            void clearPersistedCommunicationDrafts(draftPersistenceScope);
            setThreadComposerResetKey((current) => current + 1);
          }
          const nextDraft = metadataDraftFromBaseline(submittedBaseline);
          setBaseline(submittedBaseline);
          setDraft(nextDraft);
          if (
            shouldReturnToListAfterUpdate({
              finalState: submittedBaseline.metadata.state,
              navigation,
            })
          ) {
            onReturnToListAfterUpdate();
          }
        }
        if (result.status === "saved") {
          router.refresh();
        }
      })
      .catch(() => setMutationResult(actionErrorState()))
      .finally(() => setSaving(false));
  }

  const fields = (
    <>
      <TicketPrimaryMetadataFields
        detail={detail}
        dirtyFields={dirtyFields}
        draft={currentDraft}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onDraftChange={changeDraft}
        saving={saving}
      />
      <TicketAssignmentFields
        detail={detail}
        dirtyFields={dirtyFields}
        draft={currentDraft}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onDraftChange={changeDraft}
        saving={saving}
      />
      <TicketSecondaryMetadataFields
        detail={detail}
        dirtyFields={dirtyFields}
        draft={currentDraft}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onDraftChange={changeDraft}
        recentlyViewedLinkTargets={recentlyViewedLinkTargets}
        searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
        saving={saving}
      />
      {hasChanges && validation.message ? (
        <p className="text-xs text-amber-700" role="alert">
          {validation.message}
        </p>
      ) : null}
      {statusText ? (
        <p
          className={
            mutationResult.status === "failed" ||
            mutationResult.status === "saved-refresh-failed"
              ? "text-xs text-amber-700"
              : "text-xs text-slate-600"
          }
          role="alert"
        >
          {statusText}
        </p>
      ) : null}
    </>
  );

  return (
    <>
      <section
        aria-label={`Ticket detail ${detail.number}`}
        className="flex min-h-0 flex-1 bg-white"
      >
        <section
          aria-label="Ticket conversation"
          className="ticket-detail-scroll min-w-0 flex-1 overflow-y-auto"
        >
          {header}
          <TicketThread
            articles={detail.articles}
            communicationDraft={currentDraft.communication}
            communicationCapabilities={communicationCapabilities}
            disabled={saving}
            draftPersistenceScope={draftPersistenceScope}
            key={threadComposerResetKey}
            onCommunicationDraftChange={(communication) =>
              changeDraft({ ...currentDraft, communication })
            }
            onScrolledToLatest={() => setScrollAfterArticleCount(undefined)}
            rewriteDraftAction={rewriteDraftAction}
            scrollAfterArticleCount={scrollAfterArticleCount}
          />
        </section>
        <TicketDetailSidebar>{fields}</TicketDetailSidebar>
      </section>
      <TicketMetadataActionBar
        canDiscard={hasChanges}
        canUpdate={canUpdate}
        onDiscard={discardChanges}
        onUpdate={submitChanges}
        saving={saving}
      />
    </>
  );
}

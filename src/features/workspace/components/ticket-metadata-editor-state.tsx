"use client";
import { useState } from "react";
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
  noopMetadataSavedDetailRefresh,
  updatePayloadNeedsDetailRefresh,
} from "./ticket-metadata-editor-submit";
import { shouldReturnToListAfterUpdate, type PostUpdateNavigation } from "./post-update-navigation";
import { assignmentLabel } from "./ticket-assignment-fields";
import { TicketMetadataActionBar } from "./ticket-metadata-action-bar";
import { TicketMetadataEditorSidebar } from "./ticket-metadata-editor-sidebar";
import { TicketThread } from "./ticket-thread";
import { latestForwardableArticle, latestReplyableArticle } from "./communication-draft-factory";
import { CommunicationDraftReplacementDialog } from "./communication-draft-replacement-dialog";
import { useTicketCommunicationSelection } from "./use-ticket-communication-selection";
import { useCommunicationDraftScope } from "./use-communication-draft-scope";
import type { TicketMetadataEditorStateProps } from "./ticket-metadata-editor-state-types";
import { ticketCommunicationSignatureReady, useSelectedTicketSignaturePreview } from "./use-ticket-signature-preview";
import { useWorkspaceSignatureActions } from "./ticket-signature-preview-action-context";
import { useClearCommunicationDraft } from "./use-clear-communication-draft";
import { TicketMetadataMutationBanner } from
  "./ticket-metadata-mutation-banner";
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
  rephraseStyleOptions,
  rewriteDraftAction,
  searchTicketLinkTargetsAction,
  updateTicketMetadataAction,
  userId,
  workspaceId,
  helpdeskConnectionId,
  identityVersion,
}: TicketMetadataEditorStateProps) {
  const router = useRouter();
  const refreshSavedDetail = onMetadataSavedDetailRefresh ?? noopMetadataSavedDetailRefresh;
  const [renderedBaseline, setRenderedBaseline] = useState<SelectedTicketDraft>(loadedBaseline);
  const [baseline, setBaseline] = useState<SelectedTicketDraft>(loadedBaseline);
  const [draft, setDraft] = useState<SelectedTicketDraft>(metadataDraftFromBaseline(loadedBaseline));
  const [saving, setSaving] = useState(false);
  const [mutationResult, setMutationResult] = useState<TicketMetadataMutationActionState>({ status: "idle" });
  const [threadComposerResetKey, setThreadComposerResetKey] = useState(0);
  const [scrollAfterArticleCount, setScrollAfterArticleCount] = useState<number>();
  const { loadTicketSignaturePreviewAction } = useWorkspaceSignatureActions();
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
  const draftPersistenceScope = useCommunicationDraftScope(
    detail.id, userId, workspaceId, helpdeskConnectionId, identityVersion,
  );
  const clearCommunicationDraft = useClearCommunicationDraft(
    detail.id, draftPersistenceScope,
  );
  function changeDraft(nextDraft: SelectedTicketDraft) {
    setDraft(nextDraft);
    setMutationResult({ status: "idle" });
  }
  const signaturePreview = useSelectedTicketSignaturePreview({
    action: loadTicketSignaturePreviewAction,
    draft: currentDraft,
    setDraft,
    ticketExternalId: detail.id,
  });
  const canUpdate = hasChanges && validation.valid && !saving &&
    ticketCommunicationSignatureReady(currentDraft.communication, signaturePreview.state);
  const communicationSelection = useTicketCommunicationSelection({
    draft: currentDraft.communication,
    onChange: (communication) => changeDraft({ ...currentDraft, communication }),
  });
  const latestReplySource = latestReplyableArticle(detail.articles);
  const latestForwardSource = latestForwardableArticle(detail.articles);
  function discardChanges() {
    const nextDraft = metadataDraftFromBaseline(currentBaseline);
    setDraft(nextDraft);
    setMutationResult({ status: "idle" });
    clearCommunicationDraft();
  }
  function submitChanges(navigation: PostUpdateNavigation) {
    if (!canUpdate) {
      return;
    }
    const updatePayload = metadataDraftUpdatePayload(currentBaseline, currentDraft);
    if (!updatePayload) {
      return;
    }
    const submittedCommunication = Boolean(updatePayload.communication);
    const submittedArticleCount = detail.articles.length;
    setSaving(true);
    setMutationResult({ status: "idle" });
    void updateTicketMetadataAction(updatePayload)
      .then((result) => {
        setMutationResult(result);
        if (result.status === "partially-saved") {
          const submittedBaseline = metadataDraftSubmittedBaseline(currentDraft);
          onMetadataSaved({
            group: dirtyFields.group
              ? assignmentLabel(detail.lookupData.groups, submittedBaseline.metadata.groupExternalId, detail.group)
              : undefined,
            owner: dirtyFields.owner
              ? assignmentLabel(detail.lookupData.assignableUsers, submittedBaseline.metadata.ownerExternalId, detail.owner)
              : undefined,
            priority: dirtyFields.priority ? submittedBaseline.metadata.priority : undefined,
            state: dirtyFields.state || dirtyFields.pendingUntil ? submittedBaseline.metadata.state : undefined,
            ticketExternalId: submittedBaseline.ticketExternalId,
          });
          setBaseline(submittedBaseline);
          setDraft({
            ...metadataDraftFromBaseline(submittedBaseline),
            communication: currentDraft.communication,
          });
          refreshSavedDetail(submittedBaseline.ticketExternalId);
          router.refresh();
          return;
        }
        if (
          result.status === "saved" ||
          result.status === "saved-refresh-failed"
        ) {
          const submittedBaseline = metadataDraftSubmittedBaseline(currentDraft);
          const returnToList = shouldReturnToListAfterUpdate({
            finalState: submittedBaseline.metadata.state,
            navigation,
          });
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
            if (!returnToList && updatePayloadNeedsDetailRefresh(updatePayload)) {
              refreshSavedDetail(submittedBaseline.ticketExternalId);
            }
          }
          if (submittedCommunication) {
            clearCommunicationDraft({ restoreOnFailure: false });
            setThreadComposerResetKey((current) => current + 1);
          }
          const nextDraft = metadataDraftFromBaseline(submittedBaseline);
          setBaseline(submittedBaseline);
          setDraft(nextDraft);
          if (returnToList) {
            onReturnToListAfterUpdate();
          }
          if (result.status === "saved" && !returnToList) {
            router.refresh();
          }
        }
      })
      .catch(() => setMutationResult(actionErrorState()))
      .finally(() => setSaving(false));
  }
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
            conversationHistory={detail.replyPolicy?.conversationHistory}
            disabled={saving}
            draftPersistenceScope={draftPersistenceScope}
            helpdeskConnectionId={helpdeskConnectionId}
            key={threadComposerResetKey}
            managedAddresses={detail.replyPolicy?.providerManagedAddresses ?? []}
            mentionGroupExternalId={currentDraft.metadata.groupExternalId}
            onCommunicationDraftChange={(communication) =>
              changeDraft({ ...currentDraft, communication })
            }
            onRequestReply={communicationSelection.requestReply}
            onRequestForward={communicationSelection.requestForward}
            onScrolledToLatest={() => setScrollAfterArticleCount(undefined)}
            rephraseStyleOptions={rephraseStyleOptions}
            rewriteDraftAction={rewriteDraftAction}
            scrollAfterArticleCount={scrollAfterArticleCount}
            signaturePreview={signaturePreview.state}
            ticketExternalId={detail.id}
            onRetrySignaturePreview={signaturePreview.retry}
          />
        </section>
        <TicketMetadataEditorSidebar
          detail={detail}
          dirtyFields={dirtyFields}
          draft={currentDraft}
          hasChanges={hasChanges}
          metadataMutationCapabilities={metadataMutationCapabilities}
          onDraftChange={changeDraft}
          recentlyViewedLinkTargets={recentlyViewedLinkTargets}
          saving={saving}
          searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
          validationMessage={validation.message}
        />
      </section>
      <TicketMetadataMutationBanner result={mutationResult} />
      <TicketMetadataActionBar
        canComment={communicationCapabilities.internalNotes}
        canForward={Boolean(
          communicationCapabilities.customerForwards && latestForwardSource,
        )}
        canDiscard={hasChanges}
        canReply={Boolean(
          communicationCapabilities.customerReplies && latestReplySource,
        )}
        canReplyAll={Boolean(
          communicationCapabilities.customerReplies &&
          latestReplySource?.replyContext?.availableIntents.includes("reply-all"),
        )}
        canUpdate={canUpdate}
        onComment={communicationSelection.requestComment}
        onDiscard={discardChanges}
        onForward={() => {
          if (!latestForwardSource) return;
          communicationSelection.requestForward(
            latestForwardSource, detail.replyPolicy?.conversationHistory,
          );
        }}
        onReply={(intent) => {
          if (!latestReplySource) return;
          communicationSelection.requestReply(
            latestReplySource, intent, detail.replyPolicy?.conversationHistory,
          );
        }}
        onUpdate={submitChanges}
        saving={saving}
      />
      {communicationSelection.pendingReplacement ? (
        <CommunicationDraftReplacementDialog
          onCancel={communicationSelection.cancelReplacement}
          onConfirm={communicationSelection.confirmReplacement}
        />
      ) : null}
    </>
  );
}

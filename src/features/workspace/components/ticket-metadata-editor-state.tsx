"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
import type { SearchWorkspaceTicketLinkTargetsAction } from "@/features/tickets/link-target-search-action-result";
import type {
  TicketCommunicationCapabilities,
  TicketCustomerReplyActionState,
  TicketCustomerReplyPayload,
  TicketInternalNoteActionState,
  TicketInternalNotePayload,
} from "@/features/tickets/communication-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import {
  metadataDraftDirtyFields,
  metadataDraftFromBaseline,
  metadataDraftHasChanges,
  metadataDraftSubmittedBaseline,
  metadataDraftUpdatePayload,
  validateMetadataDraft,
  type SelectedTicketDraft,
  type TicketMetadataSavedPatch,
} from "./metadata-draft";
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

function noopMetadataSavedDetailRefresh() {}

function mutationStatusText(
  saving: boolean,
  result: TicketMetadataMutationActionState,
) {
  if (saving) {
    return "Saving metadata...";
  }
  if (result.status === "failed" || result.status === "saved-refresh-failed") {
    return result.message;
  }
  return undefined;
}

function actionErrorState(): TicketMetadataMutationActionState {
  return {
    status: "failed",
    message: "The ticket could not be updated. Try again.",
  };
}

export function TicketMetadataEditorState({
  addTicketCustomerReplyAction,
  addTicketInternalNoteAction,
  communicationCapabilities,
  detail,
  header,
  loadedBaseline,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  searchTicketLinkTargetsAction,
  updateTicketMetadataAction,
}: {
  addTicketCustomerReplyAction(
    request: TicketCustomerReplyPayload,
  ): Promise<TicketCustomerReplyActionState>;
  addTicketInternalNoteAction(
    request: TicketInternalNotePayload,
  ): Promise<TicketInternalNoteActionState>;
  communicationCapabilities: TicketCommunicationCapabilities;
  detail: WorkspaceTicketDetail;
  header?: ReactNode;
  loadedBaseline: SelectedTicketDraft;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh?: (ticketId: string) => void;
  onReturnToListAfterUpdate(): void;
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  updateTicketMetadataAction(
    request: SelectedTicketUpdatePayload,
  ): Promise<TicketMetadataMutationActionState>;
}) {
  const router = useRouter();
  const refreshSavedDetail =
    onMetadataSavedDetailRefresh ?? noopMetadataSavedDetailRefresh;
  const [baseline, setBaseline] = useState<SelectedTicketDraft>(loadedBaseline);
  const [draft, setDraft] = useState<SelectedTicketDraft>(
    metadataDraftFromBaseline(loadedBaseline),
  );
  const [saving, setSaving] = useState(false);
  const [mutationResult, setMutationResult] =
    useState<TicketMetadataMutationActionState>({ status: "idle" });

  const dirtyFields = metadataDraftDirtyFields(baseline, draft);
  const hasChanges = metadataDraftHasChanges(dirtyFields);
  const validation = validateMetadataDraft(detail, dirtyFields, draft);
  const statusText = mutationStatusText(saving, mutationResult);
  const canUpdate = hasChanges && validation.valid && !saving;

  function changeDraft(nextDraft: SelectedTicketDraft) {
    setDraft(nextDraft);
    setMutationResult({ status: "idle" });
  }

  function discardChanges() {
    setDraft(metadataDraftFromBaseline(baseline));
    setMutationResult({ status: "idle" });
  }

  function submitChanges(navigation: PostUpdateNavigation) {
    if (!canUpdate) {
      return;
    }

    const updatePayload = metadataDraftUpdatePayload(baseline, draft);
    if (!updatePayload) {
      return;
    }

    setSaving(true);
    setMutationResult({ status: "idle" });

    void updateTicketMetadataAction(updatePayload)
      .then((result) => {
        setMutationResult(result);
        if (
          result.status === "saved" ||
          result.status === "saved-refresh-failed"
        ) {
          const submittedBaseline = metadataDraftSubmittedBaseline(draft);
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
            refreshSavedDetail(submittedBaseline.ticketExternalId);
          }
          setBaseline(submittedBaseline);
          setDraft(metadataDraftFromBaseline(submittedBaseline));
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
        draft={draft}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onDraftChange={changeDraft}
        saving={saving}
      />
      <TicketAssignmentFields
        detail={detail}
        dirtyFields={dirtyFields}
        draft={draft}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onDraftChange={changeDraft}
        saving={saving}
      />
      <TicketSecondaryMetadataFields
        detail={detail}
        dirtyFields={dirtyFields}
        draft={draft}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onDraftChange={changeDraft}
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
          role={saving ? "status" : "alert"}
        >
          {statusText}
        </p>
      ) : null}
    </>
  );

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <div className="min-w-0 flex-1 overflow-hidden p-2">
          <section
            aria-label="Ticket conversation"
            className="relative flex h-full min-h-0 flex-col overflow-hidden rounded-md border border-slate-200 bg-white"
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-0 z-30 h-px bg-slate-200"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-3 bg-gradient-to-t from-slate-200/45 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 z-20 w-3 bg-gradient-to-r from-slate-200/45 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 right-0 z-20 w-3 bg-gradient-to-l from-slate-200/45 to-transparent"
            />
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 top-px z-20 h-3 bg-gradient-to-b from-slate-200/45 to-transparent"
            />
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="pt-2">
                {header}
                <TicketThread
                  addTicketCustomerReplyAction={addTicketCustomerReplyAction}
                  addTicketInternalNoteAction={addTicketInternalNoteAction}
                  articles={detail.articles}
                  communicationCapabilities={communicationCapabilities}
                  onCommunicationSaved={refreshSavedDetail}
                  ticketExternalId={detail.id}
                />
              </div>
            </div>
          </section>
        </div>
        <TicketDetailSidebar>{fields}</TicketDetailSidebar>
      </div>
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

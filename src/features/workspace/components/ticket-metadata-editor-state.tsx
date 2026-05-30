"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownSelect } from "@/components/ui";
import type { TicketPriority, TicketState } from "@/core/tickets";
import type {
  SelectedTicketUpdatePayload,
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
} from "@/features/tickets/mutation-model";
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
import { priorityOptions } from "./ticket-priority-mutation-options";
import { PriorityCell, StateCell } from "./ticket-table-cells";
import { TicketPendingStateForm } from "./ticket-pending-state-form";
import { EditableSidebarField, SidebarField } from "./ticket-sidebar-field";
import {
  selectedStateDisplay,
  stateMutationLabel,
  stateOptionsFor,
  stateRequiresPendingDate,
} from "./ticket-state-mutation-options";
import { TicketThread } from "./ticket-thread";

const changedControlClass = "border-amber-500 bg-amber-50 focus-visible:outline-amber-500";
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
  detail,
  loadedBaseline,
  metadataMutationCapabilities,
  onMetadataSaved,
  onMetadataSavedDetailRefresh,
  onReturnToListAfterUpdate,
  updateTicketMetadataAction,
}: {
  detail: WorkspaceTicketDetail;
  loadedBaseline: SelectedTicketDraft;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onMetadataSaved(metadata: TicketMetadataSavedPatch): void;
  onMetadataSavedDetailRefresh?: (ticketId: string) => void;
  onReturnToListAfterUpdate(): void;
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
  const stateDisplay = selectedStateDisplay(draft.metadata.state);
  const showPendingDate = stateRequiresPendingDate(detail, draft.metadata.state);
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
      {metadataMutationCapabilities.state ? (
        <EditableSidebarField label="State">
          <DropdownSelect
            ariaLabel="Ticket state"
            className="block w-full [&>div]:w-full"
            disabled={saving}
            onValueChange={(value) =>
              changeDraft({
                ...draft,
                metadata: { ...draft.metadata, state: value as TicketState },
              })
            }
            options={stateOptionsFor(detail)}
            selectedDisplay={stateDisplay}
            triggerClassName={
              dirtyFields.state ? `w-full ${changedControlClass}` : "w-full"
            }
            value={draft.metadata.state}
          />
          {showPendingDate ? (
            <div className="mt-2">
              <TicketPendingStateForm
                dateChanged={dirtyFields.pendingDate}
                disabled={saving}
                onChange={(pendingDateTime) =>
                  changeDraft({
                    ...draft,
                    metadata: { ...draft.metadata, pendingDateTime },
                  })
                }
                stateLabel={stateMutationLabel(draft.metadata.state)}
                timeChanged={dirtyFields.pendingTime}
                value={draft.metadata.pendingDateTime}
              />
            </div>
          ) : null}
        </EditableSidebarField>
      ) : (
        <SidebarField label="State">
          <StateCell label={detail.state} state={detail.stateKey} />
        </SidebarField>
      )}
      {metadataMutationCapabilities.priority ? (
        <EditableSidebarField label="Priority">
          <DropdownSelect
            ariaLabel="Ticket priority"
            className="block w-full [&>div]:w-full"
            disabled={saving}
            onValueChange={(value) =>
              changeDraft({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  priority: value as TicketPriority,
                },
              })
            }
            options={priorityOptions}
            triggerClassName={
              dirtyFields.priority ? `w-full ${changedControlClass}` : "w-full"
            }
            value={draft.metadata.priority}
          />
        </EditableSidebarField>
      ) : (
        <SidebarField label="Priority">
          <PriorityCell label={detail.priority} priority={detail.priorityKey} />
        </SidebarField>
      )}
      <TicketAssignmentFields
        detail={detail}
        dirtyFields={dirtyFields}
        draft={draft}
        metadataMutationCapabilities={metadataMutationCapabilities}
        onDraftChange={changeDraft}
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
        <div className="flex min-w-0 flex-1 flex-col">
          <TicketThread articles={detail.articles} />
        </div>
        <TicketDetailSidebar detail={detail}>{fields}</TicketDetailSidebar>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DropdownSelect, type DropdownOption } from "@/components/ui";
import {
  ticketPriorities,
  ticketPriorityDefinitions,
  type TicketPriority,
  type TicketState,
} from "@/core/tickets";
import type {
  TicketMetadataMutationActionState,
  TicketMetadataMutationCapabilities,
  WorkspaceTicketDetail,
} from "@/features/tickets";
import {
  metadataDraftDirtyFields,
  metadataDraftFormData,
  metadataDraftFromBaseline,
  metadataDraftFromDetail,
  metadataDraftHasChanges,
  metadataDraftKey,
  metadataDraftSubmittedBaseline,
  validateMetadataDraft,
  type TicketMetadataDraft,
} from "./metadata-draft";
import {
  shouldReturnToListAfterUpdate,
  type PostUpdateNavigation,
} from "./post-update-navigation";
import { TicketMetadataActionBar } from "./ticket-metadata-action-bar";
import { TicketDetailSidebar } from "./ticket-detail-sidebar";
import {
  PriorityCell,
  PriorityIcon,
  StateCell,
} from "./ticket-table-cells";
import { TicketPendingStateForm } from "./ticket-pending-state-form";
import { EditableSidebarField, SidebarField } from "./ticket-sidebar-field";
import {
  selectedStateDisplay,
  stateMutationLabel,
  stateOptionsFor,
  stateRequiresPendingDate,
} from "./ticket-state-mutation-options";
import { TicketThread } from "./ticket-thread";

const priorityOptions: DropdownOption[] = ticketPriorities.map((priority) => ({
  value: priority,
  label: ticketPriorityDefinitions[priority].label,
  icon: <PriorityIcon priority={priority} />,
}));

const changedControlClass =
  "border-amber-500 bg-amber-50 focus-visible:outline-amber-500";

function mutationStatusText(
  saving: boolean,
  result: TicketMetadataMutationActionState,
) {
  if (saving) {
    return "Saving metadata...";
  }
  if (
    result.status === "failed" ||
    result.status === "saved-refresh-failed"
  ) {
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

export function TicketMetadataEditor({
  detail,
  metadataMutationCapabilities,
  onReturnToListAfterUpdate,
  updateTicketMetadataAction,
}: {
  detail: WorkspaceTicketDetail;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onReturnToListAfterUpdate(): void;
  updateTicketMetadataAction(
    formData: FormData,
  ): Promise<TicketMetadataMutationActionState>;
}) {
  const loadedBaseline = metadataDraftFromDetail(detail);

  return (
    <TicketMetadataEditorState
      detail={detail}
      key={metadataDraftKey(loadedBaseline)}
      loadedBaseline={loadedBaseline}
      metadataMutationCapabilities={metadataMutationCapabilities}
      onReturnToListAfterUpdate={onReturnToListAfterUpdate}
      updateTicketMetadataAction={updateTicketMetadataAction}
    />
  );
}

function TicketMetadataEditorState({
  detail,
  loadedBaseline,
  metadataMutationCapabilities,
  onReturnToListAfterUpdate,
  updateTicketMetadataAction,
}: {
  detail: WorkspaceTicketDetail;
  loadedBaseline: TicketMetadataDraft;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onReturnToListAfterUpdate(): void;
  updateTicketMetadataAction(
    formData: FormData,
  ): Promise<TicketMetadataMutationActionState>;
}) {
  const router = useRouter();
  const [baseline, setBaseline] =
    useState<TicketMetadataDraft>(loadedBaseline);
  const [draft, setDraft] = useState<TicketMetadataDraft>(
    metadataDraftFromBaseline(loadedBaseline),
  );
  const [saving, setSaving] = useState(false);
  const [mutationResult, setMutationResult] =
    useState<TicketMetadataMutationActionState>({ status: "idle" });

  const dirtyFields = metadataDraftDirtyFields(baseline, draft);
  const hasChanges = metadataDraftHasChanges(dirtyFields);
  const validation = validateMetadataDraft(detail, dirtyFields, draft);
  const statusText = mutationStatusText(saving, mutationResult);
  const stateDisplay = selectedStateDisplay(draft.state);
  const showPendingDate = stateRequiresPendingDate(detail, draft.state);
  const canUpdate = hasChanges && validation.valid && !saving;

  function changeDraft(nextDraft: TicketMetadataDraft) {
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

    const formData = metadataDraftFormData(baseline, draft);
    if (!formData) {
      return;
    }

    setSaving(true);
    setMutationResult({ status: "idle" });

    void updateTicketMetadataAction(formData)
      .then((result) => {
        setMutationResult(result);
        if (
          result.status === "saved" ||
          result.status === "saved-refresh-failed"
        ) {
          const submittedBaseline = metadataDraftSubmittedBaseline(draft);
          setBaseline(submittedBaseline);
          setDraft(metadataDraftFromBaseline(submittedBaseline));
          if (
            shouldReturnToListAfterUpdate({
              finalState: submittedBaseline.state,
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
              changeDraft({ ...draft, state: value as TicketState })
            }
            options={stateOptionsFor(detail)}
            selectedDisplay={stateDisplay}
            triggerClassName={
              dirtyFields.state ? `w-full ${changedControlClass}` : "w-full"
            }
            value={draft.state}
          />
          {showPendingDate ? (
            <div className="mt-2">
              <TicketPendingStateForm
                dateChanged={dirtyFields.pendingDate}
                disabled={saving}
                onChange={(pendingDateTime) =>
                  changeDraft({ ...draft, pendingDateTime })
                }
                stateLabel={stateMutationLabel(draft.state)}
                timeChanged={dirtyFields.pendingTime}
                value={draft.pendingDateTime}
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
              changeDraft({ ...draft, priority: value as TicketPriority })
            }
            options={priorityOptions}
            triggerClassName={
              dirtyFields.priority ? `w-full ${changedControlClass}` : "w-full"
            }
            value={draft.priority}
          />
        </EditableSidebarField>
      ) : (
        <SidebarField label="Priority">
          <PriorityCell label={detail.priority} priority={detail.priorityKey} />
        </SidebarField>
      )}
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

  const actionBar = (
    <TicketMetadataActionBar
      canDiscard={hasChanges}
      canUpdate={canUpdate}
      onDiscard={discardChanges}
      onUpdate={submitChanges}
      saving={saving}
    />
  );

  return (
    <>
      <div className="flex min-h-0 flex-1">
        <div className="flex min-w-0 flex-1 flex-col">
          <TicketThread articles={detail.articles} />
        </div>
        <TicketDetailSidebar detail={detail}>{fields}</TicketDetailSidebar>
      </div>
      {actionBar}
    </>
  );
}

import { DropdownSelect } from "@/components/ui";
import type { TicketPriority, TicketState } from "@/core/tickets";
import type { TicketMetadataMutationCapabilities } from "@/features/tickets/mutation-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
} from "./metadata-draft";
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

const changedControlClass =
  "border-amber-500 bg-amber-50 focus-visible:outline-amber-500";

export function TicketPrimaryMetadataFields({
  detail,
  dirtyFields,
  draft,
  metadataMutationCapabilities,
  onDraftChange,
  saving,
}: {
  detail: WorkspaceTicketDetail;
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  metadataMutationCapabilities: TicketMetadataMutationCapabilities;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  saving: boolean;
}) {
  const stateDisplay = selectedStateDisplay(draft.metadata.state);
  const showPendingDate = stateRequiresPendingDate(detail, draft.metadata.state);

  return (
    <>
      {metadataMutationCapabilities.state ? (
        <EditableSidebarField label="State">
          <DropdownSelect
            ariaLabel="Ticket state"
            className="block w-full [&>div]:w-full"
            disabled={saving}
            onValueChange={(value) =>
              onDraftChange({
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
                  onDraftChange({
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
              onDraftChange({
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
    </>
  );
}

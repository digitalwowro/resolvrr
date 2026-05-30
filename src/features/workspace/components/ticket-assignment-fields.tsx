import { DropdownSelect, type DropdownOption } from "@/components/ui";
import type { TicketLookupList } from "@/core/ticket-lookups";
import type { TicketMetadataMutationCapabilities } from "@/features/tickets/mutation-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
} from "./metadata-draft";
import { TicketLookupOptions } from "./ticket-lookup-options";
import { EditableSidebarField, SidebarField } from "./ticket-sidebar-field";

const changedControlClass =
  "border-amber-500 bg-amber-50 focus-visible:outline-amber-500";

function lookupOptions(lookup: TicketLookupList): DropdownOption[] {
  return lookup.status === "available"
    ? lookup.options.map((option) => ({
        value: option.externalId,
        label: option.label,
      }))
    : [];
}

export function assignmentLabel(
  lookup: TicketLookupList,
  externalId: string | undefined,
  fallback: string,
): string {
  if (!externalId || lookup.status !== "available") {
    return fallback;
  }

  return (
    lookup.options.find((option) => option.externalId === externalId)?.label ??
    fallback
  );
}

function selectedDisplay(
  lookup: TicketLookupList,
  externalId: string | undefined,
  fallback: string,
): DropdownOption | undefined {
  if (!externalId) {
    return fallback ? { value: "", label: fallback } : undefined;
  }

  return {
    value: externalId,
    label: assignmentLabel(lookup, externalId, fallback),
  };
}

export function TicketAssignmentFields({
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
  const ownerOptions = lookupOptions(detail.lookupData.assignableUsers);
  const groupOptions = lookupOptions(detail.lookupData.groups);
  const ownerEditable =
    metadataMutationCapabilities.owner === true && ownerOptions.length > 0;
  const groupEditable =
    metadataMutationCapabilities.group === true && groupOptions.length > 0;

  return (
    <>
      {ownerEditable ? (
        <EditableSidebarField label="Owner">
          <DropdownSelect
            ariaLabel="Ticket owner"
            className="block w-full [&>div]:w-full"
            disabled={saving}
            onValueChange={(value) =>
              onDraftChange({
                ...draft,
                metadata: { ...draft.metadata, ownerExternalId: value },
              })
            }
            options={ownerOptions}
            placeholder="Unassigned"
            selectedDisplay={selectedDisplay(
              detail.lookupData.assignableUsers,
              draft.metadata.ownerExternalId,
              detail.owner,
            )}
            triggerClassName={
              dirtyFields.owner ? `w-full ${changedControlClass}` : "w-full"
            }
            value={draft.metadata.ownerExternalId}
          />
        </EditableSidebarField>
      ) : (
        <>
          <SidebarField label="Owner">
            <span>{detail.owner}</span>
          </SidebarField>
          <SidebarField label="Owner options">
            <TicketLookupOptions lookup={detail.lookupData.assignableUsers} />
          </SidebarField>
        </>
      )}
      {groupEditable ? (
        <EditableSidebarField label="Group">
          <DropdownSelect
            ariaLabel="Ticket group"
            className="block w-full [&>div]:w-full"
            disabled={saving}
            onValueChange={(value) =>
              onDraftChange({
                ...draft,
                metadata: { ...draft.metadata, groupExternalId: value },
              })
            }
            options={groupOptions}
            placeholder="Unassigned"
            selectedDisplay={selectedDisplay(
              detail.lookupData.groups,
              draft.metadata.groupExternalId,
              detail.group,
            )}
            triggerClassName={
              dirtyFields.group ? `w-full ${changedControlClass}` : "w-full"
            }
            value={draft.metadata.groupExternalId}
          />
        </EditableSidebarField>
      ) : (
        <>
          <SidebarField label="Group">
            <span>{detail.group}</span>
          </SidebarField>
          <SidebarField label="Group options">
            <TicketLookupOptions lookup={detail.lookupData.groups} />
          </SidebarField>
        </>
      )}
    </>
  );
}

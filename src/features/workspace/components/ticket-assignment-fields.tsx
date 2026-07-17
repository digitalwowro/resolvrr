import {
  SearchableDropdown,
  type DropdownOption,
} from "@/components/ui";
import type { TicketLookupList } from "@/core/ticket-lookups";
import type { TicketMetadataMutationCapabilities } from "@/features/tickets/mutation-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
} from "./metadata-draft";
import { TicketLookupOptions } from "./ticket-lookup-options";
import { EditableSidebarField, SidebarField } from "./ticket-sidebar-field";
import { useTicketOwnerLookup } from "./use-ticket-owner-lookup";

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
  const ownerLookup = useTicketOwnerLookup({
    groupExternalId: draft.metadata.groupExternalId,
    initialGroupExternalId: detail.groupExternalId,
    initialLookup: detail.lookupData.assignableUsers,
  });
  const ownerOptions = lookupOptions(ownerLookup.lookup);
  const groupOptions = lookupOptions(detail.lookupData.groups);
  const ownerEditable =
    metadataMutationCapabilities.owner === true &&
    Boolean(draft.metadata.groupExternalId);
  const groupEditable =
    metadataMutationCapabilities.group === true && groupOptions.length > 0;

  return (
    <>
      {ownerEditable ? (
        <EditableSidebarField label="Owner">
          <SearchableDropdown
            ariaLabel="Ticket owner"
            className="block w-full [&>div]:w-full"
            disabled={saving || ownerLookup.loading}
            emptyMessage={
              ownerLookup.loading ? "Loading owners..." : "No eligible owners"
            }
            onValueChange={(value) =>
              onDraftChange({
                ...draft,
                metadata: { ...draft.metadata, ownerExternalId: value },
              })
            }
            options={ownerOptions}
            placeholder={ownerLookup.loading ? "Loading..." : "Select owner"}
            searchPlaceholder="Find owner"
            selectedDisplay={selectedDisplay(
              ownerLookup.lookup,
              draft.metadata.ownerExternalId,
              detail.owner,
            )}
            triggerClassName={
              dirtyFields.owner ? `w-full ${changedControlClass}` : "w-full"
            }
            value={draft.metadata.ownerExternalId}
          />
          {dirtyFields.owner && !draft.metadata.ownerExternalId ? (
            <p className="mt-1 text-xs text-amber-700">
              Select an owner with full access to this group.
            </p>
          ) : null}
        </EditableSidebarField>
      ) : (
        <>
          <SidebarField label="Owner">
            <span>{detail.owner}</span>
          </SidebarField>
          <SidebarField label="Owner options">
            <TicketLookupOptions lookup={ownerLookup.lookup} />
          </SidebarField>
        </>
      )}
      {groupEditable ? (
        <EditableSidebarField label="Group">
          <SearchableDropdown
            ariaLabel="Ticket group"
            className="block w-full [&>div]:w-full"
            disabled={saving}
            onValueChange={(value) =>
              onDraftChange({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  groupExternalId: value,
                  ownerExternalId:
                    value === draft.metadata.groupExternalId
                      ? draft.metadata.ownerExternalId
                      : undefined,
                },
              })
            }
            options={groupOptions}
            placeholder="Unassigned"
            searchPlaceholder="Find group"
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

import { RotateCcw, Trash2 } from "lucide-react";
import type { ChangeEvent } from "react";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { TicketMetadataMutationCapabilities } from "@/features/tickets/mutation-model";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
} from "./metadata-draft";
import { EditableSidebarField, SidebarField } from "./ticket-sidebar-field";

const changedControlClass =
  "border-amber-500 bg-amber-50 focus-visible:outline-amber-500";

function parseTags(value: string): string[] {
  return [
    ...new Set(
      value
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
    ),
  ];
}

function directionLabel(direction: WorkspaceTicketDetail["links"][number]["direction"]) {
  if (direction === "parent") {
    return "Parent";
  }
  if (direction === "child") {
    return "Child";
  }
  return "Related";
}

function subscriptionLabel(detail: WorkspaceTicketDetail) {
  if (!detail.subscription.supported) {
    return "Unavailable";
  }
  return detail.subscription.following ? "Following" : "Not following";
}

function SubscriptionSwitch({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange(event: ChangeEvent<HTMLInputElement>): void;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex h-9 w-16 items-center rounded-full p-1 transition-colors",
        checked ? "bg-indigo-600" : "bg-slate-300",
        disabled && "cursor-not-allowed opacity-60",
      )}
    >
      <input
        aria-label="Subscribed"
        checked={checked}
        className="peer sr-only"
        disabled={disabled}
        onChange={onChange}
        type="checkbox"
      />
      <span
        aria-hidden="true"
        className="size-7 rounded-full bg-white shadow-sm transition-transform peer-checked:translate-x-7"
      />
    </span>
  );
}

export function TicketSecondaryMetadataFields({
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
  const removedLinkIds = new Set(draft.metadata.linkRemoveExternalIds);
  const canEditLinks = metadataMutationCapabilities.links === true;
  const canEditSubscription =
    metadataMutationCapabilities.subscription === true &&
    detail.subscription.supported;

  return (
    <>
      {canEditSubscription ? (
        <EditableSidebarField label="Subscribed">
          <div
            className={
              dirtyFields.subscription
                ? `rounded-md border px-3 py-2 ${changedControlClass}`
                : "rounded-md border border-slate-200 bg-white px-3 py-2"
            }
          >
            <SubscriptionSwitch
              checked={draft.metadata.subscriptionFollowing === true}
              disabled={saving}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  metadata: {
                    ...draft.metadata,
                    subscriptionFollowing: event.currentTarget.checked,
                  },
                })
              }
            />
          </div>
        </EditableSidebarField>
      ) : (
        <SidebarField label="Subscribed">
          <span>{subscriptionLabel(detail)}</span>
        </SidebarField>
      )}
      {metadataMutationCapabilities.tags ? (
        <EditableSidebarField label="Tags">
          <input
            aria-label="Ticket tags"
            className={`h-9 w-full rounded-md border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              dirtyFields.tags
                ? changedControlClass
                : "border-slate-200 bg-white focus-visible:outline-indigo-600"
            }`}
            disabled={saving}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                metadata: {
                  ...draft.metadata,
                  tagText: event.currentTarget.value,
                  tags: parseTags(event.currentTarget.value),
                },
              })
            }
            value={draft.metadata.tagText}
          />
        </EditableSidebarField>
      ) : (
        <SidebarField label="Tags">
          <span>{detail.tags.length > 0 ? detail.tags.join(", ") : "-"}</span>
        </SidebarField>
      )}
      <EditableSidebarField label="Links">
        <div className="space-y-2">
          {detail.links.length > 0 ? (
            <ul className="space-y-1">
              {detail.links.map((link) => {
                const removed = removedLinkIds.has(link.id);
                return (
                  <li
                    className={removed ? "text-slate-400 line-through" : undefined}
                    key={`${link.direction}-${link.id}`}
                  >
                    <span className="text-slate-500">
                      {directionLabel(link.direction)}:{" "}
                    </span>
                    {link.providerUrl ? (
                      <a href={link.providerUrl} rel="noreferrer" target="_blank">
                        {link.label}
                      </a>
                    ) : (
                      <span>{link.label}</span>
                    )}
                    {canEditLinks ? (
                      <Button
                        aria-label={`${removed ? "Restore" : "Remove"} link ${link.label}`}
                        className="ml-1 !h-6 px-1.5 text-xs"
                        disabled={saving}
                        icon={
                          removed ? (
                            <RotateCcw aria-hidden="true" className="size-3" />
                          ) : (
                            <Trash2 aria-hidden="true" className="size-3" />
                          )
                        }
                        onClick={() =>
                          onDraftChange({
                            ...draft,
                            metadata: {
                              ...draft.metadata,
                              linkRemoveExternalIds: removed
                                ? draft.metadata.linkRemoveExternalIds.filter(
                                    (externalId) => externalId !== link.id,
                                  )
                                : [
                                    ...draft.metadata.linkRemoveExternalIds,
                                    link.id,
                                  ],
                            },
                          })
                        }
                        type="button"
                        variant="ghost"
                      >
                        {removed ? "Restore" : "Remove"}
                      </Button>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <span>No links yet</span>
          )}
          {canEditLinks ? (
            <input
              aria-label="Related ticket ID"
              className={`h-9 w-full rounded-md border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
                draft.metadata.linkAddExternalId
                  ? changedControlClass
                  : "border-slate-200 bg-white focus-visible:outline-indigo-600"
              }`}
              disabled={saving}
              onChange={(event) =>
                onDraftChange({
                  ...draft,
                  metadata: {
                    ...draft.metadata,
                    linkAddExternalId: event.currentTarget.value.trim(),
                  },
                })
              }
              placeholder="Add related ticket ID"
              value={draft.metadata.linkAddExternalId}
            />
          ) : null}
        </div>
      </EditableSidebarField>
    </>
  );
}

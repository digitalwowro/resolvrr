import { Link2, RotateCcw, X } from "lucide-react";
import { useRef, useState } from "react";
import { cn } from "@/components/ui/classnames";
import type {
  SearchWorkspaceTicketLinkTargetsAction,
  WorkspaceTicketLinkTarget,
} from "@/features/tickets/link-target-search-action-result";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
import { TicketAddLinkDialog } from "./ticket-add-link-dialog";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
} from "./metadata-draft";

const changedControlClass =
  "border-amber-500 bg-amber-50 focus-visible:outline-amber-500";

function directionLabel(direction: WorkspaceTicketDetail["links"][number]["direction"]) {
  if (direction === "parent") {
    return "Parent";
  }
  if (direction === "child") {
    return "Child";
  }
  return "Related";
}

function linkLabelParts(label: string) {
  const match = /^(#[^\s]+)\s*(.*)$/.exec(label.trim());

  if (!match) {
    return {
      number: undefined,
      title: label,
    };
  }

  return {
    number: match[1],
    title: match[2] || label,
  };
}

export function TicketSecondaryLinksField({
  canEditLinkRelations,
  canEditLinks,
  detail,
  dirtyFields,
  draft,
  onDraftChange,
  recentlyViewedLinkTargets,
  searchTicketLinkTargetsAction,
  saving,
}: {
  canEditLinkRelations: boolean;
  canEditLinks: boolean;
  detail: WorkspaceTicketDetail;
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  recentlyViewedLinkTargets: WorkspaceTicketLinkTarget[];
  searchTicketLinkTargetsAction: SearchWorkspaceTicketLinkTargetsAction;
  saving: boolean;
}) {
  const addLinkButtonRef = useRef<HTMLButtonElement>(null);
  const [addLinkDialogOpen, setAddLinkDialogOpen] = useState(false);
  const removedLinkIds = new Set(draft.metadata.linkRemoveExternalIds);

  function closeAddLinkDialog() {
    setAddLinkDialogOpen(false);
    window.setTimeout(() => addLinkButtonRef.current?.focus(), 0);
  }

  return (
    <section aria-label="Links" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">Links</span>
        {canEditLinks ? (
          <button
            ref={addLinkButtonRef}
            className="text-xs font-normal text-indigo-600 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            disabled={saving}
            onClick={() => setAddLinkDialogOpen(true)}
            type="button"
          >
            {draft.metadata.linkAddExternalId ? "Edit link" : "Add link"}
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {canEditLinks && draft.metadata.linkAddExternalId ? (
          <div
            className={cn(
              "flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-xs",
              dirtyFields.links ? changedControlClass : "border-slate-200 bg-white",
            )}
          >
            <Link2 aria-hidden="true" className="size-3.5 shrink-0 text-slate-600" />
            <span className="min-w-0 flex-1 truncate">
              <span className="font-semibold text-slate-900">Pending link </span>
              <span className="text-slate-600">
                #{draft.metadata.linkAddExternalId}
                {draft.metadata.linkAddRelation !== "related"
                  ? ` · ${directionLabel(draft.metadata.linkAddRelation)}`
                  : ""}
              </span>
            </span>
            <button
              aria-label={`Remove staged link ${draft.metadata.linkAddExternalId}`}
              className="grid size-6 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={saving}
              onClick={() =>
                onDraftChange({
                  ...draft,
                  metadata: {
                    ...draft.metadata,
                    linkAddExternalId: "",
                    linkAddRelation: "related",
                  },
                })
              }
              type="button"
            >
              <X aria-hidden="true" className="size-3.5" />
            </button>
          </div>
        ) : null}
        {detail.links.length > 0 ? (
          <ul className="space-y-1">
            {detail.links.map((link) => {
              const removed = removedLinkIds.has(link.id);
              const { number, title } = linkLabelParts(link.label);
              return (
                <li
                  className={cn(
                    "flex min-h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs",
                    removed && "text-slate-400 line-through",
                  )}
                  key={`${link.direction}-${link.id}`}
                >
                  <Link2
                    aria-hidden="true"
                    className="size-3.5 shrink-0 text-slate-600"
                  />
                  <span className="sr-only">{directionLabel(link.direction)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {number ? (
                      <span className="font-semibold text-slate-900">
                        {number}{" "}
                      </span>
                    ) : null}
                    {link.providerUrl ? (
                      <a
                        className="text-slate-600 hover:text-indigo-700"
                        href={link.providerUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {title}
                      </a>
                    ) : (
                      <span className="text-slate-600">{title}</span>
                    )}
                  </span>
                  {canEditLinks ? (
                    <button
                      aria-label={`${removed ? "Restore" : "Remove"} link ${link.label}`}
                      className="grid size-6 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
                      disabled={saving}
                      onClick={() =>
                        onDraftChange({
                          ...draft,
                          metadata: {
                            ...draft.metadata,
                            linkRemoveExternalIds: removed
                              ? draft.metadata.linkRemoveExternalIds.filter(
                                  (externalId) => externalId !== link.id,
                                )
                              : [...draft.metadata.linkRemoveExternalIds, link.id],
                          },
                        })
                      }
                      type="button"
                    >
                      {removed ? (
                        <RotateCcw aria-hidden="true" className="size-3.5" />
                      ) : (
                        <X aria-hidden="true" className="size-3.5" />
                      )}
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <span className="text-sm text-slate-500">No links yet</span>
        )}
      </div>
      {addLinkDialogOpen ? (
        <TicketAddLinkDialog
          canEditLinkRelations={canEditLinkRelations}
          currentTicketCustomerExternalId={detail.customerExternalId}
          currentTicketExternalId={detail.id}
          initialTicketId={draft.metadata.linkAddExternalId}
          initialRelation={draft.metadata.linkAddRelation}
          onAdd={({ relation, ticketId }) => {
            onDraftChange({
              ...draft,
              metadata: {
                ...draft.metadata,
                linkAddExternalId: ticketId,
                linkAddRelation: relation,
              },
            });
            closeAddLinkDialog();
          }}
          onClose={closeAddLinkDialog}
          recentlyViewedTargets={recentlyViewedLinkTargets}
          searchTicketLinkTargetsAction={searchTicketLinkTargetsAction}
          saving={saving}
        />
      ) : null}
    </section>
  );
}

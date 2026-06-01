import { Link2, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/ui/classnames";
import type { WorkspaceTicketDetail } from "@/features/tickets/workspace-adapter";
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
  canEditLinks,
  detail,
  dirtyFields,
  draft,
  onDraftChange,
  saving,
}: {
  canEditLinks: boolean;
  detail: WorkspaceTicketDetail;
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  saving: boolean;
}) {
  const [showLinkInput, setShowLinkInput] = useState(
    Boolean(draft.metadata.linkAddExternalId),
  );
  const removedLinkIds = new Set(draft.metadata.linkRemoveExternalIds);

  return (
    <section aria-label="Links" className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold">Links</span>
        {canEditLinks ? (
          <button
            className="text-xs font-normal text-indigo-600 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            disabled={saving}
            onClick={() => setShowLinkInput(true)}
            type="button"
          >
            Add link
          </button>
        ) : null}
      </div>
      <div className="space-y-2">
        {canEditLinks && showLinkInput ? (
          <input
            aria-label="Related ticket ID"
            className={cn(
              "h-10 w-full rounded-md border px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
              dirtyFields.links || draft.metadata.linkAddExternalId
                ? changedControlClass
                : "border-slate-200 bg-white focus-visible:outline-indigo-600",
            )}
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
            placeholder="Related ticket ID"
            value={draft.metadata.linkAddExternalId}
          />
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
    </section>
  );
}

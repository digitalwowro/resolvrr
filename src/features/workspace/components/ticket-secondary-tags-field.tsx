import { X } from "lucide-react";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { cn } from "@/components/ui/classnames";
import type {
  SelectedTicketDraft,
  TicketMetadataDraftDirtyFields,
} from "./metadata-draft";

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

function tagsDraft(nextTags: string[], draft: SelectedTicketDraft) {
  return {
    ...draft,
    metadata: {
      ...draft.metadata,
      tagText: nextTags.join(", "),
      tags: nextTags,
    },
  };
}

export function TicketSecondaryTagsField({
  canEditTags,
  dirtyFields,
  draft,
  onDraftChange,
  saving,
}: {
  canEditTags: boolean;
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  saving: boolean;
}) {
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [pendingTagText, setPendingTagText] = useState("");

  function commitPendingTags(value: string) {
    const nextTags = [...new Set([...draft.metadata.tags, ...parseTags(value)])];
    if (nextTags.length === draft.metadata.tags.length) {
      setPendingTagText("");
      return;
    }
    onDraftChange(tagsDraft(nextTags, draft));
    setPendingTagText("");
  }

  function handlePendingTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }
    event.preventDefault();
    commitPendingTags(event.currentTarget.value);
  }

  function focusTagInput() {
    if (!saving) {
      tagInputRef.current?.focus();
    }
  }

  function removeTag(
    event: MouseEvent<HTMLButtonElement>,
    tagToRemove: string,
  ) {
    event.stopPropagation();
    onDraftChange(
      tagsDraft(
        draft.metadata.tags.filter((currentTag) => currentTag !== tagToRemove),
        draft,
      ),
    );
  }

  return (
    <section aria-label="Tags" className="space-y-2">
      <span className="block text-xs font-semibold">Tags</span>
      <div
        className={cn(
          "flex min-h-10 flex-wrap items-center gap-2 rounded-md border bg-white px-2.5 py-2",
          canEditTags &&
            !saving &&
            "cursor-text focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-100",
          dirtyFields.tags ? changedControlClass : "border-slate-200",
        )}
        onClick={canEditTags ? focusTagInput : undefined}
      >
        {draft.metadata.tags.length > 0 ? (
          draft.metadata.tags.map((tag) => (
            <span
              className="inline-flex h-6 max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 text-xs text-slate-900"
              key={tag}
            >
              <span className="min-w-0 truncate">{tag}</span>
              {canEditTags ? (
                <button
                  aria-label={`Remove tag ${tag}`}
                  className="grid size-4 shrink-0 place-items-center rounded text-slate-500 hover:bg-slate-200 hover:text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600"
                  disabled={saving}
                  onClick={(event) => removeTag(event, tag)}
                  type="button"
                >
                  <X aria-hidden="true" className="size-3" />
                </button>
              ) : null}
            </span>
          ))
        ) : (
          <span className="text-sm text-slate-500">No tags</span>
        )}
        {canEditTags ? (
          <input
            aria-label="Add tag"
            className={cn(
              "h-6 bg-transparent text-xs caret-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed",
              pendingTagText ? "w-24 px-1" : "w-px shrink-0 p-0",
              draft.metadata.tags.length === 0 && "min-w-20 flex-1 px-1",
            )}
            disabled={saving}
            onBlur={(event) => commitPendingTags(event.currentTarget.value)}
            onChange={(event) => setPendingTagText(event.currentTarget.value)}
            onKeyDown={handlePendingTagKeyDown}
            placeholder={draft.metadata.tags.length > 0 ? "" : "Add tag"}
            ref={tagInputRef}
            value={pendingTagText}
          />
        ) : null}
      </div>
    </section>
  );
}

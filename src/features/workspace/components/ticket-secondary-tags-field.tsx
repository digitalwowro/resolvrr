import { X } from "lucide-react";
import {
  useMemo,
  useRef,
  useState,
  useId,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { cn } from "@/components/ui/classnames";
import type { TicketLookupList } from "@/core/ticket-lookups";
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

function normalizedTag(value: string) {
  return value.trim().toLowerCase();
}

function tagSuggestionLabels(
  tagLookup: TicketLookupList,
  selectedTags: string[],
  query: string,
) {
  if (tagLookup.status !== "available") {
    return [];
  }

  const selected = new Set(selectedTags.map(normalizedTag));
  const normalizedQuery = normalizedTag(query);
  if (!normalizedQuery) {
    return [];
  }

  return tagLookup.options
    .map((option) => option.label.trim())
    .filter((label) => {
      const normalizedLabel = normalizedTag(label);
      return (
        normalizedLabel &&
        !selected.has(normalizedLabel) &&
        normalizedLabel.includes(normalizedQuery)
      );
    })
    .sort((left, right) => left.localeCompare(right));
}

export function TicketSecondaryTagsField({
  canEditTags,
  dirtyFields,
  draft,
  tagLookup,
  onDraftChange,
  saving,
}: {
  canEditTags: boolean;
  dirtyFields: TicketMetadataDraftDirtyFields;
  draft: SelectedTicketDraft;
  tagLookup: TicketLookupList;
  onDraftChange(nextDraft: SelectedTicketDraft): void;
  saving: boolean;
}) {
  const suggestionsId = useId();
  const tagInputRef = useRef<HTMLInputElement>(null);
  const [pendingTagText, setPendingTagText] = useState("");
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const suggestions = useMemo(
    () => tagSuggestionLabels(tagLookup, draft.metadata.tags, pendingTagText),
    [draft.metadata.tags, pendingTagText, tagLookup],
  );
  const showSuggestions =
    canEditTags && suggestionsOpen && suggestions.length > 0;

  function commitPendingTags(value: string) {
    const nextTags = [...new Set([...draft.metadata.tags, ...parseTags(value)])];
    if (nextTags.length !== draft.metadata.tags.length) {
      onDraftChange(tagsDraft(nextTags, draft));
    }
    setPendingTagText("");
  }

  function addTag(tag: string) {
    const nextTags = [...new Set([...draft.metadata.tags, tag.trim()])].filter(
      Boolean,
    );
    onDraftChange(tagsDraft(nextTags, draft));
    setPendingTagText("");
    setSuggestionsOpen(false);
    tagInputRef.current?.focus();
  }

  function handlePendingTagKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setSuggestionsOpen(false);
      return;
    }
    if (event.key !== "Enter" && event.key !== ",") {
      return;
    }
    event.preventDefault();
    commitPendingTags(event.currentTarget.value);
    setSuggestionsOpen(false);
  }

  function focusTagInput() {
    if (!saving) {
      tagInputRef.current?.focus();
      setSuggestionsOpen(true);
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
    <section aria-label="Tags" className="relative space-y-2">
      <span className="block text-xs font-semibold">Tags</span>
      <div
        className={cn(
          "flex min-h-9 flex-wrap items-center rounded-md border bg-white px-2.5 py-1",
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
              className="mb-1 mr-1 inline-flex h-6 max-w-full items-center gap-1.5 rounded-md bg-slate-100 px-2 text-xs text-slate-900"
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
          !canEditTags ? (
            <span className="text-sm text-slate-500">No tags</span>
          ) : null
        )}
        {canEditTags ? (
          <input
            aria-label="Add tag"
            aria-autocomplete="list"
            aria-controls={suggestionsId}
            aria-expanded={showSuggestions}
            aria-haspopup="listbox"
            className={cn(
              "h-6 min-w-14 flex-1 bg-transparent px-1 text-xs caret-slate-900 outline-none placeholder:text-slate-400 disabled:cursor-not-allowed",
              pendingTagText && "min-w-24",
            )}
            disabled={saving}
            onBlur={(event) => {
              commitPendingTags(event.currentTarget.value);
              setSuggestionsOpen(false);
            }}
            onChange={(event) => setPendingTagText(event.currentTarget.value)}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={handlePendingTagKeyDown}
            placeholder={draft.metadata.tags.length > 0 ? "" : "Add tag"}
            ref={tagInputRef}
            role="combobox"
            value={pendingTagText}
          />
        ) : null}
      </div>
      {showSuggestions ? (
        <div
          className="absolute inset-x-0 top-full z-40 mt-1 max-h-52 overflow-y-auto rounded-md border border-slate-200 bg-white py-1 shadow-md"
          id={suggestionsId}
          role="listbox"
        >
          {suggestions.map((tag) => (
            <button
              className="block w-full px-3 py-1.5 text-left text-sm text-slate-900 hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none"
              key={tag}
              onMouseDown={(event) => {
                event.preventDefault();
                addTag(tag);
              }}
              aria-selected="false"
              role="option"
              type="button"
            >
              {tag}
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}

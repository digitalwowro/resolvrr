"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type RefObject,
} from "react";
import type { TicketMentionOption } from "@/core/ticket-mentions";
import { lookupWorkspaceMentionableUsersAction } from "@/features/tickets/lookup-actions";

type MentionTrigger = {
  query: string;
  range: Range;
};

type MentionPopupPosition = {
  left: number;
  top: number;
};

const defaultPopupPosition: MentionPopupPosition = { left: 12, top: 32 };

function positionedCaret(range: Range): { bottom: number; left: number } | undefined {
  const caret = range.cloneRange();
  caret.collapse(false);
  if (typeof caret.getBoundingClientRect === "function") {
    const rect = caret.getBoundingClientRect();
    if (rect.height || rect.width) {
      return { bottom: rect.bottom, left: rect.left };
    }
  }
  if (typeof range.getClientRects !== "function") return undefined;
  const rects = range.getClientRects();
  const last = rects.length ? rects[rects.length - 1] : undefined;
  return last ? { bottom: last.bottom, left: last.right } : undefined;
}

function mentionPopupPosition(
  editor: HTMLElement,
  range: Range,
): MentionPopupPosition {
  const caretRect = positionedCaret(range);
  if (!caretRect) return defaultPopupPosition;
  const editorRect = editor.getBoundingClientRect();
  const width = editorRect.width || editor.clientWidth;
  const desiredLeft = caretRect.left - editorRect.left;
  const maxLeft = width ? Math.max(8, width - 328) : desiredLeft;
  return {
    left: Math.min(Math.max(8, desiredLeft), maxLeft),
    top: Math.max(8, caretRect.bottom - editorRect.top + 4),
  };
}

function currentTrigger(editor: HTMLElement): MentionTrigger | undefined {
  const selection = window.getSelection();
  const caret = selection?.rangeCount ? selection.getRangeAt(0) : undefined;
  if (
    !caret ||
    !caret.collapsed ||
    !editor.contains(caret.startContainer) ||
    caret.startContainer.nodeType !== Node.TEXT_NODE
  ) {
    return undefined;
  }
  const text = caret.startContainer.textContent ?? "";
  const beforeCaret = text.slice(0, caret.startOffset);
  const match = beforeCaret.match(/@@([^@\n]{1,80})$/u);
  const query = match?.[1].trim();
  if (!match || !query) return undefined;
  const range = document.createRange();
  range.setStart(caret.startContainer, caret.startOffset - match[0].length);
  range.setEnd(caret.startContainer, caret.startOffset);
  return { query, range };
}

function insertMention(
  editor: HTMLElement,
  option: TicketMentionOption,
): boolean {
  const trigger = currentTrigger(editor);
  if (!trigger) return false;
  const mention = document.createElement("span");
  mention.contentEditable = "false";
  mention.dataset.resolvrrMentionId = option.externalId;
  mention.textContent = option.label;
  const spacer = document.createTextNode("\u00a0");
  trigger.range.deleteContents();
  trigger.range.insertNode(spacer);
  trigger.range.insertNode(mention);
  const selection = window.getSelection();
  const caret = document.createRange();
  caret.setStartAfter(spacer);
  caret.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(caret);
  editor.focus();
  return true;
}

export function useTicketMentionSuggestions({
  disabled,
  editorRef,
  groupExternalId,
  onInserted,
}: {
  disabled: boolean;
  editorRef: RefObject<HTMLDivElement | null>;
  groupExternalId?: string;
  onInserted(): void;
}) {
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<TicketMentionOption[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [resolvedKey, setResolvedKey] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const [popupPosition, setPopupPosition] =
    useState<MentionPopupPosition>(defaultPopupPosition);
  const requestSequence = useRef(0);
  const open = Boolean(query) && !disabled;
  const listId = "ticket-mention-suggestions";

  useEffect(() => {
    if (!query || disabled || !groupExternalId) return;
    const sequence = ++requestSequence.current;
    const requestKey = `${groupExternalId}:${query}`;
    const timer = window.setTimeout(() => {
      void lookupWorkspaceMentionableUsersAction({
        groupExternalId,
        query,
      })
        .then((result) => {
          if (sequence !== requestSequence.current) return;
          setActiveIndex(0);
          if (result.status === "available") {
            setOptions(result.options.slice(0, 12));
            setUnavailable(false);
            setResolvedKey(requestKey);
            return;
          }
          setOptions([]);
          setUnavailable(true);
          setResolvedKey(requestKey);
        })
        .catch(() => {
          if (sequence !== requestSequence.current) return;
          setOptions([]);
          setUnavailable(true);
          setResolvedKey(requestKey);
        });
    }, 200);
    return () => {
      window.clearTimeout(timer);
      if (requestSequence.current === sequence) {
        requestSequence.current += 1;
      }
    };
  }, [disabled, groupExternalId, query]);

  function close() {
    if (!query && options.length === 0 && !resolvedKey && !unavailable) {
      return;
    }
    requestSequence.current += 1;
    setQuery("");
    setOptions([]);
    setResolvedKey("");
    setUnavailable(false);
  }

  function updateFromSelection() {
    const editor = editorRef.current;
    if (!editor || disabled) {
      close();
      return;
    }
    const next = currentTrigger(editor);
    if (!next) {
      close();
      return;
    }
    setPopupPosition(mentionPopupPosition(editor, next.range));
    setQuery(next.query);
  }

  function select(option: TicketMentionOption) {
    const editor = editorRef.current;
    if (!editor || !insertMention(editor, option)) {
      close();
      return;
    }
    close();
    onInserted();
  }

  const requestKey = groupExternalId && query
    ? `${groupExternalId}:${query}`
    : "";
  const visibleOptions = resolvedKey === requestKey ? options : [];
  const status = !groupExternalId || (resolvedKey === requestKey && unavailable)
    ? "unavailable"
    : resolvedKey === requestKey ? "idle" : "loading";

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): boolean {
    if (!open) return false;
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return true;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (visibleOptions.length) {
        const offset = event.key === "ArrowDown" ? 1 : -1;
        setActiveIndex((current) =>
          (current + offset + visibleOptions.length) % visibleOptions.length
        );
      }
      return true;
    }
    if (event.key === "Enter" && visibleOptions[activeIndex]) {
      event.preventDefault();
      select(visibleOptions[activeIndex]);
      return true;
    }
    return false;
  }

  const popup = open ? (
    <div
      className="absolute z-30 max-h-64 w-80 max-w-[calc(100%-1.5rem)] overflow-y-auto rounded-md border border-slate-200 bg-white shadow-lg"
      id={listId}
      role="listbox"
      style={popupPosition}
    >
      {status === "loading" ? (
        <p className="px-3 py-2 text-xs text-slate-500" role="status">
          Finding Zammad agents…
        </p>
      ) : null}
      {status === "unavailable" ? (
        <p className="px-3 py-2 text-xs text-amber-700" role="status">
          Mention suggestions are unavailable for this group.
        </p>
      ) : null}
      {status === "idle" && visibleOptions.length === 0 ? (
        <p className="px-3 py-2 text-xs text-slate-500">No matching agents.</p>
      ) : null}
      {visibleOptions.map((option, index) => (
        <button
          aria-selected={index === activeIndex}
          className={`block w-full px-3 py-2 text-left text-sm ${
            index === activeIndex
              ? "bg-indigo-50 text-indigo-950"
              : "text-slate-800 hover:bg-slate-50"
          }`}
          id={`${listId}-${index}`}
          key={option.externalId}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => select(option)}
          role="option"
          type="button"
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : null;

  return {
    editorAria: disabled
      ? {}
      : {
          "aria-activedescendant": open && visibleOptions[activeIndex]
            ? `${listId}-${activeIndex}`
            : undefined,
          "aria-autocomplete": "list" as const,
          "aria-controls": open ? listId : undefined,
          "aria-expanded": open,
        },
    handleKeyDown,
    popup,
    updateFromSelection,
  };
}

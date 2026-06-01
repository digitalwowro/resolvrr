"use client";

import {
  Bold,
  Italic,
  Link,
  List,
  ListOrdered,
  Redo2,
  Underline,
  Undo2,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import { communicationBodyHasText } from "@/features/tickets/communication-body";
import { sanitizeComposerHtml } from "@/security/sanitize-html";

type TicketRichTextEditorProps = {
  autoFocus?: boolean;
  className?: string;
  disabled: boolean;
  id: string;
  label: string;
  onChange(value: string): void;
  onClose?(): void;
  placeholder: string;
  value: string;
};

type EditorCommand =
  | "bold"
  | "createLink"
  | "insertOrderedList"
  | "insertUnorderedList"
  | "italic"
  | "redo"
  | "undo"
  | "underline";

type ActiveToolbarState = {
  bold: boolean;
  italic: boolean;
  link: boolean;
  orderedList: boolean;
  underline: boolean;
  unorderedList: boolean;
};

const inactiveToolbarState: ActiveToolbarState = {
  bold: false,
  italic: false,
  link: false,
  orderedList: false,
  underline: false,
  unorderedList: false,
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function safeLinkHref(value: string | null): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) {
    return undefined;
  }

  const href = /^[a-z][a-z0-9+.-]*:/iu.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;

  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol)
      ? url.toString()
      : undefined;
  } catch {
    return undefined;
  }
}

function selectionNodeInEditor(editor: HTMLElement): Node | null {
  const selection = window.getSelection();
  const node = selection?.anchorNode ?? null;
  if (!node) {
    return null;
  }

  return editor.contains(node) ? node : null;
}

function selectionInsideLink(editor: HTMLElement): boolean {
  const node = selectionNodeInEditor(editor);
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest("a"));
}

function selectionInsideUnderline(editor: HTMLElement): boolean {
  const node = selectionNodeInEditor(editor);
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest("u"));
}

function commandState(command: EditorCommand): boolean {
  return typeof document.queryCommandState === "function" &&
    document.queryCommandState(command);
}

function clearStickyFormattingWhenEmpty(editor: HTMLElement) {
  if (communicationBodyHasText(editor.innerHTML)) {
    return false;
  }

  if (typeof document.execCommand === "function") {
    for (const command of [
      "bold",
      "italic",
      "underline",
      "insertOrderedList",
      "insertUnorderedList",
    ] as const) {
      if (commandState(command)) {
        document.execCommand(command, false);
      }
    }
  }

  editor.innerHTML = "";
  return true;
}

function appendHtml(editor: HTMLElement, html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  editor.append(template.content.cloneNode(true));
}

function insertEditorContent(editor: HTMLElement, content: string, html: boolean) {
  const command = html ? "insertHTML" : "insertText";
  const inserted =
    typeof document.execCommand === "function" &&
    document.execCommand(command, false, content);
  if (inserted) {
    return;
  }

  if (html) {
    appendHtml(editor, content);
    return;
  }

  editor.append(document.createTextNode(content));
}

function normalizeEditorStructure(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  for (const div of Array.from(template.content.querySelectorAll("div"))) {
    const paragraph = document.createElement("p");
    paragraph.replaceChildren(...Array.from(div.childNodes));
    div.replaceWith(paragraph);
  }
  return template.innerHTML;
}

function setDefaultParagraphSeparator() {
  if (typeof document.execCommand !== "function") {
    return;
  }

  document.execCommand("defaultParagraphSeparator", false, "p");
}

function fragmentHasText(fragment: DocumentFragment): boolean {
  const container = document.createElement("div");
  container.append(fragment.cloneNode(true));
  return communicationBodyHasText(container.innerHTML);
}

function ensureParagraphContent(paragraph: HTMLParagraphElement) {
  if (communicationBodyHasText(paragraph.innerHTML)) {
    return;
  }

  paragraph.replaceChildren(document.createElement("br"));
}

function placeCaretAtStart(element: HTMLElement) {
  const selection = window.getSelection();
  if (!selection) {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function insertParagraphFromBareContent(editor: HTMLElement): boolean {
  if (editor.querySelector("p,ol,ul,li")) {
    return false;
  }

  const selection = window.getSelection();
  const selectionRange = selection?.rangeCount ? selection.getRangeAt(0) : null;
  if (!selectionRange || !editor.contains(selectionRange.commonAncestorContainer)) {
    return false;
  }

  const beforeRange = document.createRange();
  beforeRange.selectNodeContents(editor);
  beforeRange.setEnd(selectionRange.startContainer, selectionRange.startOffset);

  const afterRange = document.createRange();
  afterRange.selectNodeContents(editor);
  afterRange.setStart(selectionRange.endContainer, selectionRange.endOffset);

  const beforeContent = beforeRange.cloneContents();
  const afterContent = afterRange.cloneContents();
  if (!fragmentHasText(beforeContent) && !fragmentHasText(afterContent)) {
    return false;
  }

  const currentParagraph = document.createElement("p");
  currentParagraph.append(beforeContent);
  ensureParagraphContent(currentParagraph);

  const nextParagraph = document.createElement("p");
  nextParagraph.append(afterContent);
  ensureParagraphContent(nextParagraph);

  editor.replaceChildren(currentParagraph, nextParagraph);
  placeCaretAtStart(nextParagraph);
  return true;
}

function insertParagraph(editor: HTMLElement) {
  setDefaultParagraphSeparator();
  if (insertParagraphFromBareContent(editor)) {
    return;
  }

  const inserted =
    typeof document.execCommand === "function" &&
    document.execCommand("insertParagraph", false);
  if (inserted) {
    return;
  }

  appendHtml(editor, "<p><br></p>");
}

function insertLineBreak(editor: HTMLElement) {
  const inserted =
    typeof document.execCommand === "function" &&
    document.execCommand("insertLineBreak", false);
  if (inserted) {
    return;
  }

  appendHtml(editor, "<br>");
}

function ToolbarButton({
  children,
  active,
  className,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  disabled: boolean;
  label: string;
  onClick(): void;
}) {
  return (
    <Tooltip content={label} delayMs={150} side="bottom">
      <button
        aria-label={label}
        aria-pressed={active ?? undefined}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md hover:bg-slate-200 hover:text-slate-900 active:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40",
          active
            ? "font-bold text-slate-950 [&_svg]:stroke-[3]"
            : "text-slate-600",
          className,
        )}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={(event) => event.preventDefault()}
        type="button"
      >
        {children}
      </button>
    </Tooltip>
  );
}

export function TicketRichTextEditor({
  autoFocus = false,
  className,
  disabled,
  id,
  label,
  onChange,
  onClose,
  placeholder,
  value,
}: TicketRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorFocusedRef = useRef(false);
  const [activeToolbarState, setActiveToolbarState] =
    useState<ActiveToolbarState>(inactiveToolbarState);
  const empty = !communicationBodyHasText(value);

  const updateActiveToolbarState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !selectionNodeInEditor(editor)) {
      setActiveToolbarState(inactiveToolbarState);
      return;
    }

    const link = selectionInsideLink(editor);
    setActiveToolbarState({
      bold: commandState("bold"),
      italic: commandState("italic"),
      link,
      orderedList: commandState("insertOrderedList"),
      underline: commandState("underline") && (!link || selectionInsideUnderline(editor)),
      unorderedList: commandState("insertUnorderedList"),
    });
  }, []);

  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editorFocusedRef.current) {
      return;
    }
    if (editor && editor.innerHTML !== value) {
      editor.innerHTML = normalizeEditorStructure(value);
    }
  }, [value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!autoFocus || !editor) {
      return;
    }

    setDefaultParagraphSeparator();
    editor.focus({ preventScroll: true });
    if (typeof editor.scrollIntoView === "function") {
      editor.scrollIntoView({
        block: "center",
        inline: "nearest",
        behavior: "smooth",
      });
    }
  }, [autoFocus]);

  useEffect(() => {
    document.addEventListener("selectionchange", updateActiveToolbarState);
    return () =>
      document.removeEventListener("selectionchange", updateActiveToolbarState);
  }, [updateActiveToolbarState]);

  function emitChange() {
    const editor = editorRef.current;
    if (!editor) {
      onChange("");
      updateActiveToolbarState();
      return;
    }

    const normalizedHtml = normalizeEditorStructure(editor.innerHTML);
    if (editor.innerHTML !== normalizedHtml) {
      editor.innerHTML = normalizedHtml;
    }

    const clearedFormatting = clearStickyFormattingWhenEmpty(editor);
    onChange(editor.innerHTML);
    if (clearedFormatting) {
      setActiveToolbarState(inactiveToolbarState);
      return;
    }
    updateActiveToolbarState();
  }

  function fallbackCommand(command: EditorCommand, commandValue?: string) {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const text = editor.textContent?.trim() ?? "";
    const escapedText = escapeHtml(text);
    const escapedValue = commandValue ? escapeHtml(commandValue) : "";
    const nextHtml: Record<EditorCommand, string> = {
      bold: `<strong>${escapedText}</strong>`,
      createLink: `<a href="${escapedValue}">${escapedText || escapedValue}</a>`,
      insertOrderedList: `<ol><li>${escapedText}</li></ol>`,
      insertUnorderedList: `<ul><li>${escapedText}</li></ul>`,
      italic: `<em>${escapedText}</em>`,
      redo: editor.innerHTML,
      undo: editor.innerHTML,
      underline: `<u>${escapedText}</u>`,
    };

    editor.innerHTML = nextHtml[command];
    emitChange();
  }

  function execute(command: EditorCommand, commandValue?: string) {
    if (disabled) {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    editor.focus();
    const executed =
      typeof document.execCommand === "function" &&
      document.execCommand(command, false, commandValue);

    if (!executed) {
      fallbackCommand(command, commandValue);
      return;
    }

    emitChange();
    updateActiveToolbarState();
  }

  function insertLink() {
    const href = safeLinkHref(window.prompt("Link URL"));
    if (!href) {
      return;
    }
    execute("createLink", href);
  }

  function handlePaste(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const html = sanitizeComposerHtml(event.clipboardData.getData("text/html"));
    if (html && communicationBodyHasText(html)) {
      insertEditorContent(editor, html, true);
      emitChange();
      return;
    }

    const text = event.clipboardData.getData("text/plain");
    if (!text) {
      return;
    }
    insertEditorContent(editor, text, false);
    emitChange();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter") {
      return;
    }

    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    event.preventDefault();
    if (event.shiftKey) {
      insertLineBreak(editor);
    } else {
      insertParagraph(editor);
    }
    emitChange();
  }

  return (
    <div className={cn("overflow-hidden rounded-md border bg-white", className)}>
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
        <ToolbarButton
          disabled={disabled}
          label="Undo"
          onClick={() => execute("undo")}
        >
          <Undo2 aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          disabled={disabled}
          label="Redo"
          onClick={() => execute("redo")}
        >
          <Redo2 aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={activeToolbarState.bold}
          disabled={disabled}
          label="Bold"
          onClick={() => execute("bold")}
        >
          <Bold aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={activeToolbarState.italic}
          disabled={disabled}
          label="Italic"
          onClick={() => execute("italic")}
        >
          <Italic aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={activeToolbarState.underline}
          disabled={disabled}
          label="Underline"
          onClick={() => execute("underline")}
        >
          <Underline aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={activeToolbarState.unorderedList}
          disabled={disabled}
          label="Bulleted list"
          onClick={() => execute("insertUnorderedList")}
        >
          <List aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={activeToolbarState.orderedList}
          disabled={disabled}
          label="Numbered list"
          onClick={() => execute("insertOrderedList")}
        >
          <ListOrdered aria-hidden="true" className="size-4" />
        </ToolbarButton>
        <ToolbarButton
          active={activeToolbarState.link}
          disabled={disabled}
          label="Insert link"
          onClick={insertLink}
        >
          <Link aria-hidden="true" className="size-4" />
        </ToolbarButton>
        {onClose ? (
          <div className="ml-auto">
            <ToolbarButton
              className="border border-slate-300 bg-white"
              disabled={disabled}
              label="Close editor"
              onClick={onClose}
            >
              <X aria-hidden="true" className="size-4" />
            </ToolbarButton>
          </div>
        ) : null}
      </div>
      <div className="relative">
        {empty ? (
          <div className="pointer-events-none absolute left-3 top-2 text-sm leading-5 text-slate-400">
            {placeholder}
          </div>
        ) : null}
        <div
          aria-disabled={disabled}
          aria-label={label}
          aria-multiline="true"
          className="min-h-24 w-full px-3 py-2 text-sm leading-5 text-slate-900 outline-none focus:ring-0 [&_a]:font-medium [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 [&_br]:block [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
          contentEditable={!disabled}
          id={id}
          onBlur={() => {
            editorFocusedRef.current = false;
          }}
          onFocus={() => {
            editorFocusedRef.current = true;
          }}
          onInput={emitChange}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveToolbarState}
          onMouseUp={updateActiveToolbarState}
          onPaste={handlePaste}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
        />
      </div>
    </div>
  );
}

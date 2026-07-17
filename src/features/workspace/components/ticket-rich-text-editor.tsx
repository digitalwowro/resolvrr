"use client";

import {
  forwardRef, useCallback, useEffect, useRef, useState,
  type ClipboardEvent, type KeyboardEvent, type ReactNode,
} from "react";
import { cn } from "@/components/ui/classnames";
import { communicationBodyHasText } from "@/features/tickets/communication-body";
import {
  sanitizeComposerEditorHtml,
  sanitizeComposerHtml,
  sanitizeSignatureTemplateHtml,
} from "@/security/sanitize-html";
import {
  commandState,
  clearStickyFormattingWhenEmpty,
  fallbackEditorCommand,
  inactiveToolbarState,
  insertEditorContent,
  insertLineBreak,
  insertParagraph,
  normalizeEditorStructure,
  safeLinkHref,
  selectionInsideLink,
  selectionInsideUnderline,
  selectionNodeInEditor,
  setDefaultParagraphSeparator,
  type ActiveToolbarState,
  type EditorCommand,
} from "./ticket-rich-text-editor-dom";
import { TicketRichTextEditorToolbarRow } from "./ticket-rich-text-editor-toolbar-row";
import { useTicketMentionSuggestions } from "./use-ticket-mention-suggestions";
import {
  useTicketRichTextEditorRewrite,
  type TicketRichTextEditorHandle,
} from "./use-ticket-rich-text-editor-rewrite";
type TicketRichTextEditorProps = {
  autoFocus?: boolean;
  className?: string;
  disabled: boolean;
  extraToolbarControls?: ReactNode;
  id: string;
  label: string;
  mentionGroupExternalId?: string;
  onChange(value: string): void;
  onRewriteSelectionChange?(active: boolean): void;
  placeholder: string;
  readOnlyFooter?: ReactNode;
  value: string;
  contentKind?: "communication" | "signature";
};
export type { TicketRichTextEditorHandle } from "./use-ticket-rich-text-editor-rewrite";
export const TicketRichTextEditor = forwardRef<TicketRichTextEditorHandle, TicketRichTextEditorProps>(function TicketRichTextEditor({
  autoFocus = false,
  className,
  disabled,
  extraToolbarControls,
  id,
  label,
  mentionGroupExternalId,
  onChange,
  onRewriteSelectionChange,
  placeholder,
  readOnlyFooter,
  value,
  contentKind = "communication",
}, ref) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const editorFocusedRef = useRef(false);
  const [activeToolbarState, setActiveToolbarState] =
    useState<ActiveToolbarState>(inactiveToolbarState);
  const empty = !communicationBodyHasText(value) &&
    !(contentKind === "signature" && /<img\b/iu.test(value));
  const sanitizeEditorHtml = contentKind === "signature"
    ? sanitizeSignatureTemplateHtml
    : sanitizeComposerEditorHtml;
  const rewrite = useTicketRichTextEditorRewrite({
    disabled,
    editorRef,
    onApplied: emitChange,
    onSelectionChange: onRewriteSelectionChange,
    ref,
  });
  const updateActiveToolbarState = useCallback(() => {
    const editor = editorRef.current;
    if (!editor || !selectionNodeInEditor(editor)) {
      setActiveToolbarState(inactiveToolbarState);
      return;
    }
    rewrite.rememberCurrentSelection();
    const link = selectionInsideLink(editor);
    setActiveToolbarState({
      bold: commandState("bold"),
      italic: commandState("italic"),
      link,
      orderedList: commandState("insertOrderedList"),
      underline: commandState("underline") && (!link || selectionInsideUnderline(editor)),
      unorderedList: commandState("insertUnorderedList"),
    });
  }, [rewrite]);
  const mentions = useTicketMentionSuggestions({
    disabled: disabled || contentKind !== "communication",
    editorRef,
    groupExternalId: mentionGroupExternalId,
    onInserted: emitChange,
  });
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editorFocusedRef.current) {
      return;
    }
    const safeValue = normalizeEditorStructure(sanitizeEditorHtml(value));
    if (editor && editor.innerHTML !== safeValue) {
      editor.innerHTML = safeValue;
    }
  }, [sanitizeEditorHtml, value]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!autoFocus || !editor) {
      return;
    }

    setDefaultParagraphSeparator();
    editor.focus({ preventScroll: true });
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

    const normalizedHtml = normalizeEditorStructure(
      sanitizeEditorHtml(editor.innerHTML),
    );
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
    fallbackEditorCommand(editor, command, commandValue);
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

    const html = contentKind === "signature"
      ? sanitizeSignatureTemplateHtml(event.clipboardData.getData("text/html"))
      : sanitizeComposerHtml(event.clipboardData.getData("text/html"));
    if (html && (communicationBodyHasText(html) || /<img\b/iu.test(html))) {
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
    if (event.key !== "Tab") rewrite.clearSelection();
    if (mentions.handleKeyDown(event)) {
      return;
    }
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
    <div
      className={cn("rounded-md border bg-white", className)}
      onBlur={rewrite.handleContainerBlur}
    >
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <TicketRichTextEditorToolbarRow
        activeToolbarState={activeToolbarState}
        disabled={disabled}
        extraControls={extraToolbarControls}
        onCommand={execute}
        onInsertLink={insertLink}
      />
      <div className="relative">
        {empty ? (
          <div className="pointer-events-none absolute left-3 top-2 text-sm leading-5 text-slate-400">
            {placeholder}
          </div>
        ) : null}
        <div
          {...mentions.editorAria}
          aria-disabled={disabled}
          aria-label={label}
          aria-multiline="true"
          className="min-h-24 w-full px-3 py-2 text-sm leading-5 text-slate-900 outline-none focus:ring-0 [&_[data-resolvrr-mention-id]]:rounded [&_[data-resolvrr-mention-id]]:bg-indigo-100 [&_[data-resolvrr-mention-id]]:px-1 [&_[data-resolvrr-mention-id]]:font-medium [&_[data-resolvrr-mention-id]]:text-indigo-800 [&_a]:font-medium [&_a]:text-indigo-600 [&_a]:underline [&_a]:underline-offset-2 [&_br]:block [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
          contentEditable={!disabled}
          id={id}
          onBlur={() => { editorFocusedRef.current = false; }}
          onFocus={() => { editorFocusedRef.current = true; }}
          onInput={() => {
            rewrite.clearSelection();
            mentions.updateFromSelection();
            emitChange();
          }}
          onKeyDown={handleKeyDown}
          onKeyUp={updateActiveToolbarState}
          onMouseDown={rewrite.clearSelection}
          onMouseUp={updateActiveToolbarState}
          onPaste={handlePaste}
          ref={editorRef}
          role="textbox"
          suppressContentEditableWarning
        />
        {mentions.popup}
      </div>
      {readOnlyFooter}
    </div>
  );
});

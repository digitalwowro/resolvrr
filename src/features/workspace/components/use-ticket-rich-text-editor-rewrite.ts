"use client";

import {
  useCallback,
  useImperativeHandle,
  useRef,
  type FocusEvent,
  type Ref,
  type RefObject,
} from "react";
import {
  applyEditorRewriteSelection,
  captureEditorRewriteSelection,
  captureEditorRewriteTarget,
  type EditorRewriteSelection,
  type EditorRewriteTargetCapture,
  type EditorSelectionApplyResult,
} from "./ticket-rich-text-editor-selection";

export type TicketRichTextEditorHandle = {
  applySelectionRewrite(
    selection: EditorRewriteSelection,
    replacementText: string,
  ): EditorSelectionApplyResult;
  captureRewriteTarget(): EditorRewriteTargetCapture;
};

export function useTicketRichTextEditorRewrite(input: {
  disabled: boolean;
  editorRef: RefObject<HTMLDivElement | null>;
  onApplied(): void;
  onSelectionChange?(active: boolean): void;
  ref: Ref<TicketRichTextEditorHandle>;
}) {
  const {
    disabled,
    editorRef,
    onApplied,
    onSelectionChange,
    ref,
  } = input;
  const selectionRef = useRef<
    EditorRewriteSelection | null | "unsupported-selection"
  >(null);
  const selectionActiveRef = useRef(false);
  const reportSelection = useCallback((active: boolean) => {
    if (selectionActiveRef.current === active) return;
    selectionActiveRef.current = active;
    onSelectionChange?.(active);
  }, [onSelectionChange]);

  const clearSelection = useCallback(() => {
    selectionRef.current = null;
    reportSelection(false);
  }, [reportSelection]);
  const rememberCurrentSelection = useCallback(() => {
    const editor = editorRef.current;
    if (editor) {
      const captured = captureEditorRewriteSelection(editor);
      if (captured !== null) {
        selectionRef.current = captured;
        reportSelection(captured !== "unsupported-selection");
      }
    }
  }, [editorRef, reportSelection]);
  const handleContainerBlur = useCallback(
    (event: FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !event.currentTarget.contains(next)) {
        clearSelection();
      }
    },
    [clearSelection],
  );

  useImperativeHandle(ref, () => ({
    applySelectionRewrite(selection, replacementText) {
      const editor = editorRef.current;
      if (!editor || disabled) return { status: "stale" };
      const result = applyEditorRewriteSelection(
        editor,
        selection,
        replacementText,
      );
      if (result.status === "applied") {
        if (editor.innerHTML !== result.html) editor.innerHTML = result.html;
        clearSelection();
        onApplied();
      }
      return result;
    },
    captureRewriteTarget() {
      const editor = editorRef.current;
      if (!editor) {
        return {
          status: "available",
          target: { html: "", kind: "draft" },
        };
      }
      return captureEditorRewriteTarget(editor, selectionRef.current);
    },
  }), [clearSelection, disabled, editorRef, onApplied]);

  return {
    clearSelection,
    handleContainerBlur,
    rememberCurrentSelection,
  };
}

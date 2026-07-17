"use client";

import { communicationBodyHasText } from "@/features/tickets/communication-body";
import { sanitizeComposerEditorHtml } from "@/security/sanitize-html";
import { normalizeEditorStructure } from "./ticket-rich-text-editor-dom";
import { normalizeRewriteRange } from "./ticket-rich-text-editor-range";

export type EditorRewriteSelection = {
  endOffset: number;
  endPath: number[];
  fragmentHtml: string;
  selectedText: string;
  sourceHtml: string;
  startOffset: number;
  startPath: number[];
};

export type EditorRewriteTarget =
  | { html: string; kind: "draft" }
  | { kind: "selection"; selection: EditorRewriteSelection };

export type EditorRewriteTargetCapture =
  | { status: "available"; target: EditorRewriteTarget }
  | {
      reason: "stale-selection" | "unsupported-selection";
      status: "invalid";
    };

export type EditorSelectionApplyResult =
  | { html: string; status: "applied" }
  | { status: "stale" };

function safeEditorHtml(editor: HTMLElement): string {
  return normalizeEditorStructure(sanitizeComposerEditorHtml(editor.innerHTML));
}

function nodePath(root: Node, node: Node): number[] | null {
  const path: number[] = [];
  let current: Node | null = node;
  while (current && current !== root) {
    const parent: Node | null = current.parentNode;
    if (!parent) return null;
    const index = Array.prototype.indexOf.call(parent.childNodes, current);
    if (index < 0) return null;
    path.unshift(index);
    current = parent;
  }
  return current === root ? path : null;
}

function nodeFromPath(root: Node, path: number[]): Node | null {
  let current = root;
  for (const index of path) {
    const next: ChildNode | undefined = current.childNodes[index];
    if (!next) return null;
    current = next;
  }
  return current;
}

function validOffset(node: Node, offset: number): boolean {
  const maximum = node.nodeType === Node.TEXT_NODE
    ? node.textContent?.length ?? 0
    : node.childNodes.length;
  return Number.isInteger(offset) && offset >= 0 && offset <= maximum;
}

function validSnapshot(snapshot: EditorRewriteSelection): boolean {
  return typeof snapshot.sourceHtml === "string" &&
    typeof snapshot.fragmentHtml === "string" &&
    typeof snapshot.selectedText === "string" &&
    Array.isArray(snapshot.startPath) &&
    snapshot.startPath.every(Number.isInteger) &&
    Array.isArray(snapshot.endPath) &&
    snapshot.endPath.every(Number.isInteger) &&
    Number.isInteger(snapshot.startOffset) &&
    Number.isInteger(snapshot.endOffset);
}

function rangeHtml(range: Range): string {
  const container = document.createElement("div");
  container.append(range.cloneContents());
  return normalizeEditorStructure(
    sanitizeComposerEditorHtml(container.innerHTML),
  );
}

function rangeTouchesMention(editor: HTMLElement, range: Range): boolean {
  return Array.from(
    editor.querySelectorAll("[data-resolvrr-mention-id]"),
  ).some((mention) => {
    try {
      return range.intersectsNode(mention);
    } catch {
      return true;
    }
  });
}

export function captureEditorRewriteSelection(
  editor: HTMLElement,
): EditorRewriteSelection | null | "unsupported-selection" {
  const selection = window.getSelection();
  if (!selection?.rangeCount || selection.isCollapsed) return null;
  const range = normalizeRewriteRange(editor, selection.getRangeAt(0));
  if (
    !editor.contains(range.startContainer) ||
    !editor.contains(range.endContainer)
  ) {
    return null;
  }
  if (rangeTouchesMention(editor, range)) return "unsupported-selection";

  const startPath = nodePath(editor, range.startContainer);
  const endPath = nodePath(editor, range.endContainer);
  const fragmentHtml = rangeHtml(range);
  const selectedText = range.toString();
  if (
    !startPath ||
    !endPath ||
    !selectedText.trim() ||
    !communicationBodyHasText(fragmentHtml)
  ) {
    return "unsupported-selection";
  }

  return {
    endOffset: range.endOffset,
    endPath,
    fragmentHtml,
    selectedText,
    sourceHtml: safeEditorHtml(editor),
    startOffset: range.startOffset,
    startPath,
  };
}

export function captureEditorRewriteTarget(
  editor: HTMLElement,
  remembered: EditorRewriteSelection | null | "unsupported-selection",
): EditorRewriteTargetCapture {
  const fresh = captureEditorRewriteSelection(editor);
  const candidate = fresh ?? remembered;
  if (candidate === "unsupported-selection") {
    return { reason: candidate, status: "invalid" };
  }
  if (candidate && candidate.sourceHtml === safeEditorHtml(editor)) {
    return {
      status: "available",
      target: { kind: "selection", selection: candidate },
    };
  }
  if (candidate) {
    return { reason: "stale-selection", status: "invalid" };
  }
  return {
    status: "available",
    target: { html: safeEditorHtml(editor), kind: "draft" },
  };
}

function insertPlainText(range: Range, text: string) {
  range.deleteContents();
  const fragment = document.createDocumentFragment();
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (index > 0) fragment.append(document.createElement("br"));
    fragment.append(document.createTextNode(line));
  });
  const lastNode = fragment.lastChild;
  range.insertNode(fragment);
  if (!lastNode) return;
  const selection = window.getSelection();
  const caret = document.createRange();
  caret.setStartAfter(lastNode);
  caret.collapse(true);
  selection?.removeAllRanges();
  selection?.addRange(caret);
}

export function applyEditorRewriteSelection(
  editor: HTMLElement,
  snapshot: EditorRewriteSelection,
  replacementText: string,
): EditorSelectionApplyResult {
  if (!validSnapshot(snapshot) || safeEditorHtml(editor) !== snapshot.sourceHtml) {
    return { status: "stale" };
  }
  const start = nodeFromPath(editor, snapshot.startPath);
  const end = nodeFromPath(editor, snapshot.endPath);
  if (
    !start ||
    !end ||
    !validOffset(start, snapshot.startOffset) ||
    !validOffset(end, snapshot.endOffset)
  ) {
    return { status: "stale" };
  }

  const range = document.createRange();
  try {
    range.setStart(start, snapshot.startOffset);
    range.setEnd(end, snapshot.endOffset);
  } catch {
    return { status: "stale" };
  }
  if (
    range.toString() !== snapshot.selectedText ||
    rangeHtml(range) !== snapshot.fragmentHtml ||
    rangeTouchesMention(editor, range)
  ) {
    return { status: "stale" };
  }

  editor.focus();
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
  const inserted = typeof document.execCommand === "function" &&
    document.execCommand("insertText", false, replacementText);
  if (!inserted) insertPlainText(range, replacementText);
  return { html: safeEditorHtml(editor), status: "applied" };
}

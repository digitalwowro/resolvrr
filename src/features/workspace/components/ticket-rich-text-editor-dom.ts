"use client";

import { communicationBodyHasText } from "@/features/tickets/communication-body";

export type EditorCommand =
  | "bold"
  | "createLink"
  | "insertOrderedList"
  | "insertUnorderedList"
  | "italic"
  | "redo"
  | "undo"
  | "underline";

export type ActiveToolbarState = {
  bold: boolean;
  italic: boolean;
  link: boolean;
  orderedList: boolean;
  underline: boolean;
  unorderedList: boolean;
};

export const inactiveToolbarState: ActiveToolbarState = {
  bold: false,
  italic: false,
  link: false,
  orderedList: false,
  underline: false,
  unorderedList: false,
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

export function safeLinkHref(value: string | null): string | undefined {
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

export function selectionNodeInEditor(editor: HTMLElement): Node | null {
  const selection = window.getSelection();
  const node = selection?.anchorNode ?? null;
  if (!node) {
    return null;
  }

  return editor.contains(node) ? node : null;
}

export function selectionInsideLink(editor: HTMLElement): boolean {
  const node = selectionNodeInEditor(editor);
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest("a"));
}

export function selectionInsideUnderline(editor: HTMLElement): boolean {
  const node = selectionNodeInEditor(editor);
  const element = node instanceof Element ? node : node?.parentElement;
  return Boolean(element?.closest("u"));
}

export function commandState(command: EditorCommand): boolean {
  return typeof document.queryCommandState === "function" &&
    document.queryCommandState(command);
}

export function clearStickyFormattingWhenEmpty(editor: HTMLElement) {
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

export function appendHtml(editor: HTMLElement, html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;
  editor.append(template.content.cloneNode(true));
}

export function insertEditorContent(
  editor: HTMLElement,
  content: string,
  html: boolean,
) {
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

export function normalizeEditorStructure(html: string): string {
  const template = document.createElement("template");
  template.innerHTML = html;
  for (const div of Array.from(template.content.querySelectorAll("div"))) {
    const paragraph = document.createElement("p");
    paragraph.replaceChildren(...Array.from(div.childNodes));
    div.replaceWith(paragraph);
  }
  return template.innerHTML;
}

export function setDefaultParagraphSeparator() {
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

export function insertParagraph(editor: HTMLElement) {
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

export function insertLineBreak(editor: HTMLElement) {
  const inserted =
    typeof document.execCommand === "function" &&
    document.execCommand("insertLineBreak", false);
  if (inserted) {
    return;
  }

  appendHtml(editor, "<br>");
}

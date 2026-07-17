"use client";

import type {
  DraftRewriteResult,
  DraftRewriteTarget,
} from "@/features/ai";
import type { PersistedDraftAiSuggestion } from "./ticket-communication-draft-persistence";
import { escapeHtml } from "./ticket-rich-text-editor-dom";
import type { EditorRewriteTarget } from "./ticket-rich-text-editor-selection";

export function draftRewriteResultMessage(
  result: Exclude<DraftRewriteResult, { status: "available" }>,
) {
  if (result.status === "unconfigured") {
    return "AI drafting is not configured for this workspace.";
  }
  if (result.reason === "empty-draft") {
    return "Write or select some text before using AI.";
  }
  if (result.reason === "invalid-rephrase-style") {
    return "Select an available rephrase style.";
  }
  if (result.reason === "provider-rate-limited") {
    return "The AI provider is rate limited. Try again shortly.";
  }
  if (result.reason === "provider-auth-failed") {
    return "The AI provider credentials need attention.";
  }
  if (result.reason === "provider-request-rejected") {
    return "The AI provider rejected this request. Try again or check provider permissions.";
  }
  return "AI drafting is temporarily unavailable.";
}

export function plainTextToComposerHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

export function suggestionLabel(
  result: Extract<DraftRewriteResult, { status: "available" }>,
  selectedTextOnly: boolean,
): string {
  const label = result.operation === "proofread"
    ? "Proofread"
    : result.rephraseStyle
      ? `Rephrase: ${result.rephraseStyle.label}`
      : "Rephrase";
  return selectedTextOnly ? `${label} selection` : label;
}

export function suggestionId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `suggestion-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function rewriteTargets(target: EditorRewriteTarget): {
  persistedTarget: NonNullable<PersistedDraftAiSuggestion["target"]>;
  requestTarget: DraftRewriteTarget;
} {
  if (target.kind === "selection") {
    return {
      persistedTarget: { kind: "selection", selection: target.selection },
      requestTarget: {
        fragmentHtml: target.selection.fragmentHtml,
        kind: "selection",
      },
    };
  }
  return {
    persistedTarget: { kind: "draft" },
    requestTarget: { bodyHtml: target.html, kind: "draft" },
  };
}

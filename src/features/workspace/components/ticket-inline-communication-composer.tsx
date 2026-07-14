"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import type {
  AiRephraseStyleOption,
  DraftRewriteResult,
  RewriteDraftAction,
} from "@/features/ai";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { PersistedDraftAiSuggestion } from "./ticket-communication-draft-persistence";
import { escapeHtml } from "./ticket-rich-text-editor-dom";
import { TicketRichTextEditor } from "./ticket-rich-text-editor";

export type InlineCommunicationMode = "comment" | "forward" | "reply";

type InlineCommunicationComposerProps = {
  body: string;
  editorId: string;
  disabled: boolean;
  draftRestored?: boolean;
  suggestions: PersistedDraftAiSuggestion[];
  mode: InlineCommunicationMode;
  onBodyChange(body: string): void;
  onSuggestionsChange(suggestions: PersistedDraftAiSuggestion[]): void;
  rephraseStyleOptions?: AiRephraseStyleOption[];
  rewriteDraftAction?: RewriteDraftAction;
};

function resultMessage(result: Exclude<DraftRewriteResult, { status: "available" }>) {
  if (result.status === "unconfigured") {
    return "AI drafting is not configured for this workspace.";
  }
  if (result.reason === "empty-draft") {
    return "Write a draft before using AI.";
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
  return "AI drafting is temporarily unavailable.";
}

function plainTextToComposerHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function suggestionLabel(
  result: Extract<DraftRewriteResult, { status: "available" }>,
): string {
  if (result.operation === "proofread") {
    return "Proofread";
  }
  return result.rephraseStyle
    ? `Rephrase: ${result.rephraseStyle.label}`
    : "Rephrase";
}

function suggestionId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ??
    `suggestion-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

export function TicketInlineCommunicationComposer({
  body,
  editorId,
  disabled,
  draftRestored = false,
  mode,
  onBodyChange,
  onSuggestionsChange,
  rephraseStyleOptions = [],
  rewriteDraftAction,
  suggestions,
}: InlineCommunicationComposerProps) {
  const label = mode === "comment" ? "Comment" : mode === "forward" ? "Forward" : "Reply";
  const [pendingOperation, setPendingOperation] = useState<
    "proofread" | "rephrase" | null
  >(null);
  const [rephraseStyleId, setRephraseStyleId] = useState(
    rephraseStyleOptions[0]?.id ?? "",
  );
  const selectedStyleId =
    rephraseStyleOptions.some((style) => style.id === rephraseStyleId)
      ? rephraseStyleId
      : rephraseStyleOptions[0]?.id ?? "";
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(
    suggestions[0]?.id ?? "",
  );
  const [message, setMessage] = useState<string | null>(
    draftRestored ? "Draft restored." : null,
  );
  const selectedSuggestion =
    suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ??
    suggestions[0];

  async function rewriteDraft(operation: "proofread" | "rephrase") {
    if (!rewriteDraftAction) {
      setMessage("AI drafting is unavailable.");
      return;
    }

    setPendingOperation(operation);
    setMessage(null);
    try {
      const result = await rewriteDraftAction({
        bodyHtml: body,
        composerMode: mode === "forward" ? "reply" : mode,
        operation,
        ...(operation === "rephrase"
          ? { rephraseStyleId: selectedStyleId }
          : {}),
      });
      if (result.status !== "available") {
        setMessage(resultMessage(result));
        return;
      }

      const suggestion: PersistedDraftAiSuggestion = {
        generatedAt: result.generatedAt,
        id: suggestionId(),
        label: suggestionLabel(result),
        operation: result.operation,
        ...(result.rephraseStyle
          ? { rephraseStyleId: result.rephraseStyle.id }
          : {}),
        text: result.text,
      };
      const nextSuggestions = [
        suggestion,
        ...suggestions.filter((item) => item.id !== suggestion.id),
      ].slice(0, 3);
      setSelectedSuggestionId(suggestion.id);
      onSuggestionsChange(nextSuggestions);
    } finally {
      setPendingOperation(null);
    }
  }

  function applySuggestion() {
    if (!selectedSuggestion) {
      return;
    }
    onBodyChange(plainTextToComposerHtml(selectedSuggestion.text));
    setMessage("Suggestion applied.");
  }

  function discardSuggestion() {
    if (!selectedSuggestion) {
      return;
    }
    const nextSuggestions = suggestions.filter(
      (suggestion) => suggestion.id !== selectedSuggestion.id,
    );
    setSelectedSuggestionId(nextSuggestions[0]?.id ?? "");
    onSuggestionsChange(nextSuggestions);
  }

  const aiControls = (
    <>
      <button
        className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-950 disabled:cursor-wait disabled:opacity-50"
        disabled={disabled || Boolean(pendingOperation)}
        onClick={() => void rewriteDraft("proofread")}
        type="button"
      >
        <Sparkles aria-hidden="true" className="size-3" />
        Proofread
      </button>
      <select
        aria-label="Rephrase style"
        className="h-6 rounded-md border border-slate-200 bg-white px-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
        disabled={
          disabled || Boolean(pendingOperation) || rephraseStyleOptions.length === 0
        }
        onChange={(event) =>
          setRephraseStyleId(event.currentTarget.value)
        }
        value={selectedStyleId}
      >
        {rephraseStyleOptions.map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
      <button
        className="inline-flex h-6 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-700 hover:bg-slate-200 hover:text-slate-950 disabled:cursor-wait disabled:opacity-50"
        disabled={
          disabled ||
          Boolean(pendingOperation) ||
          rephraseStyleOptions.length === 0
        }
        onClick={() => void rewriteDraft("rephrase")}
        type="button"
      >
        <Sparkles aria-hidden="true" className="size-3" />
        Rephrase
      </button>
    </>
  );

  return (
    <div
      aria-label={`${label} composer`}
      className="border-b border-slate-200 bg-indigo-50/30 px-4 py-4"
      role="form"
    >
      <TicketRichTextEditor
        autoFocus
        className="border-slate-200"
        disabled={disabled}
        extraToolbarControls={aiControls}
        id={`${mode}-${editorId}`}
        label={label}
        onChange={onBodyChange}
        placeholder={mode === "comment"
          ? "Write a comment..."
          : mode === "forward" ? "Add a message..." : "Write a reply..."}
        value={body}
      />
      {message ? (
        <p className="mt-2 text-xs text-slate-600" role="status">
          {message}
        </p>
      ) : null}
      {selectedSuggestion ? (
        <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50/60 p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {suggestions.map((suggestion) => (
              <button
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-medium",
                  selectedSuggestion.id === suggestion.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-slate-700 hover:bg-slate-50",
                )}
                key={suggestion.id}
                onClick={() => setSelectedSuggestionId(suggestion.id)}
                type="button"
              >
                {suggestion.label}
              </button>
            ))}
          </div>
          <div className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-md bg-white p-2 text-sm text-slate-900">
            {selectedSuggestion.text}
          </div>
          <div className="mt-2 flex gap-2">
            <Button onClick={applySuggestion} type="button" variant="primary">
              Apply
            </Button>
            <Button onClick={discardSuggestion} type="button" variant="secondary">
              Discard
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

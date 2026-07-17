"use client";

import { useState } from "react";
import type {
  AiRephraseStyleOption,
  DraftRewriteResult,
  RewriteDraftAction,
} from "@/features/ai";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import { TicketAiEditorToolbar } from "./ticket-ai-editor-toolbar";
import type { PersistedDraftAiSuggestion } from "./ticket-communication-draft-persistence";
import { escapeHtml } from "./ticket-rich-text-editor-dom";
import { TicketRichTextEditor } from "./ticket-rich-text-editor";
import { TicketSignaturePreview } from "./ticket-signature-preview";
import type { TicketSignaturePreviewState } from "./use-ticket-signature-preview";

export type InlineCommunicationMode = "comment" | "forward" | "reply";

type InlineCommunicationComposerProps = {
  body: string;
  editorId: string;
  disabled: boolean;
  draftRestored?: boolean;
  suggestions: PersistedDraftAiSuggestion[];
  mode: InlineCommunicationMode;
  mentionGroupExternalId?: string;
  onBodyChange(body: string): void;
  onSuggestionsChange(suggestions: PersistedDraftAiSuggestion[]): void;
  rephraseStyleOptions?: AiRephraseStyleOption[];
  rewriteDraftAction?: RewriteDraftAction;
  signaturePreview?: TicketSignaturePreviewState;
  onRetrySignaturePreview?(): void;
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
  if (result.reason === "provider-request-rejected") {
    return "The AI provider rejected this request. Try again or check provider permissions.";
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
  mentionGroupExternalId,
  onBodyChange,
  onSuggestionsChange,
  rephraseStyleOptions = [],
  rewriteDraftAction,
  signaturePreview,
  onRetrySignaturePreview,
  suggestions,
}: InlineCommunicationComposerProps) {
  const label = mode === "comment" ? "Comment" : mode === "forward" ? "Forward" : "Reply";
  const [pendingOperation, setPendingOperation] = useState<
    "proofread" | "rephrase" | null
  >(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(
    suggestions[0]?.id ?? "",
  );
  const [message, setMessage] = useState<string | null>(
    draftRestored ? "Draft restored." : null,
  );
  const selectedSuggestion =
    suggestions.find((suggestion) => suggestion.id === selectedSuggestionId) ??
    suggestions[0];

  async function rewriteDraft(request:
    | { operation: "proofread" }
    | { operation: "rephrase"; styleId: string }) {
    if (!rewriteDraftAction) {
      setMessage("AI drafting is unavailable.");
      return;
    }

    setPendingOperation(request.operation);
    setMessage(null);
    try {
      const result = await rewriteDraftAction({
        bodyHtml: body,
        composerMode: mode === "forward" ? "reply" : mode,
        operation: request.operation,
        ...(request.operation === "rephrase"
          ? { rephraseStyleId: request.styleId }
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
    <TicketAiEditorToolbar
      disabled={disabled}
      onProofread={() => void rewriteDraft({ operation: "proofread" })}
      onRephrase={(styleId) => {
        void rewriteDraft({ operation: "rephrase", styleId });
      }}
      pending={Boolean(pendingOperation)}
      styles={rephraseStyleOptions}
    />
  );

  return (
    <div
      aria-label={`${label} composer`}
      className="border-b border-slate-200 px-4 pb-4 pt-3"
      role="form"
    >
      <TicketRichTextEditor
        autoFocus
        className="border-slate-200"
        disabled={disabled}
        extraToolbarControls={aiControls}
        id={`${mode}-${editorId}`}
        label={label}
        mentionGroupExternalId={mentionGroupExternalId}
        onChange={onBodyChange}
        placeholder={mode === "comment"
          ? "Write a comment..."
          : mode === "forward" ? "Add a message..." : "Write a reply..."}
        value={body}
      />
      {mode !== "comment" && signaturePreview && onRetrySignaturePreview ? (
        <TicketSignaturePreview
          key={signaturePreview.status === "available"
            ? signaturePreview.signature.contextVersion
            : signaturePreview.status}
          onRetry={onRetrySignaturePreview}
          preview={signaturePreview}
        />
      ) : null}
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

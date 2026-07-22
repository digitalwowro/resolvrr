"use client";

import { useRef, useState, type ReactNode } from "react";
import type {
  AiRephraseStyleOption,
  RewriteDraftAction,
} from "@/features/ai";
import { Button } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import {
  draftRewriteResultMessage,
  plainTextToComposerHtml,
  rewriteTargets,
  suggestionId,
  suggestionLabel,
} from "./ticket-ai-draft-suggestions";
import { TicketAiEditorToolbar } from "./ticket-ai-editor-toolbar";
import type { PersistedDraftAiSuggestion } from "./ticket-communication-draft-persistence";
import {
  TicketRichTextEditor,
  type TicketRichTextEditorHandle,
} from "./ticket-rich-text-editor";
import { TicketSignaturePreview } from "./ticket-signature-preview";
import type { TicketSignaturePreviewState } from "./use-ticket-signature-preview";

export type InlineCommunicationMode = "comment" | "forward" | "reply";

type InlineCommunicationComposerProps = {
  body: string;
  conversationHistoryFooter?: ReactNode;
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

export function TicketInlineCommunicationComposer({
  body,
  conversationHistoryFooter,
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
  const editorRef = useRef<TicketRichTextEditorHandle | null>(null);
  const label = mode === "comment" ? "Comment" : mode === "forward" ? "Forward" : "Reply";
  const [pendingOperation, setPendingOperation] = useState<
    "proofread" | "rephrase" | null
  >(null);
  const [selectionRewriteActive, setSelectionRewriteActive] = useState(false);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState(
    suggestions[0]?.id ?? "",
  );
  const [message, setMessage] = useState<string | null>(null);
  const displayedMessage = message ?? (draftRestored ? "Draft restored." : null);
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
      const captured = editorRef.current?.captureRewriteTarget() ?? {
        status: "available" as const,
        target: { html: body, kind: "draft" as const },
      };
      if (captured.status === "invalid") {
        setMessage(captured.reason === "stale-selection"
          ? "The selected text changed. Select it again before using AI."
          : "Mentions and non-text selections cannot be rewritten.");
        return;
      }
      const targets = rewriteTargets(captured.target);
      const result = await rewriteDraftAction({
        composerMode: mode === "forward" ? "reply" : mode,
        operation: request.operation,
        ...(request.operation === "rephrase"
          ? { rephraseStyleId: request.styleId }
          : {}),
        target: targets.requestTarget,
      });
      if (result.status !== "available") {
        setMessage(draftRewriteResultMessage(result));
        return;
      }

      const suggestion: PersistedDraftAiSuggestion = {
        generatedAt: result.generatedAt,
        id: suggestionId(),
        label: suggestionLabel(
          result,
          targets.persistedTarget.kind === "selection",
        ),
        operation: result.operation,
        ...(result.rephraseStyle
          ? { rephraseStyleId: result.rephraseStyle.id }
          : {}),
        target: targets.persistedTarget,
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
    if (selectedSuggestion.target?.kind === "selection") {
      const result = editorRef.current?.applySelectionRewrite(
        selectedSuggestion.target.selection,
        selectedSuggestion.text,
      );
      if (result?.status !== "applied") {
        setMessage(
          "The selected text changed after this suggestion was generated. Select it again and retry.",
        );
        return;
      }
      setMessage("Suggestion applied to the selected text.");
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
      selectionActive={selectionRewriteActive}
      styles={rephraseStyleOptions}
    />
  );
  const signatureFooter =
    mode !== "comment" && signaturePreview && onRetrySignaturePreview ? (
      <TicketSignaturePreview
        key={signaturePreview.status === "available"
          ? signaturePreview.signature.contextVersion
          : signaturePreview.status}
        onRetry={onRetrySignaturePreview}
        preview={signaturePreview}
      />
    ) : undefined;
  const readOnlyFooter = signatureFooter || conversationHistoryFooter ? (
    <>
      {signatureFooter}
      {conversationHistoryFooter}
    </>
  ) : undefined;

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
        onRewriteSelectionChange={setSelectionRewriteActive}
        placeholder={mode === "comment"
          ? "Write a comment..."
          : mode === "forward" ? "Add a message..." : "Write a reply..."}
        readOnlyFooter={readOnlyFooter}
        value={body}
        ref={editorRef}
      />
      {displayedMessage ? (
        <p className="mt-2 text-xs text-slate-600" role="status">
          {displayedMessage}
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

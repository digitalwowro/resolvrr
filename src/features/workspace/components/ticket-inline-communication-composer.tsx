"use client";

import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import { TicketRichTextEditor } from "./ticket-rich-text-editor";

export type InlineCommunicationMode = "comment" | "reply";

type InlineCommunicationComposerProps = {
  article: WorkspaceArticle;
  body: string;
  disabled: boolean;
  mode: InlineCommunicationMode;
  onBodyChange(body: string): void;
  onClose(): void;
};

export function TicketInlineCommunicationComposer({
  article,
  body,
  disabled,
  mode,
  onBodyChange,
  onClose,
}: InlineCommunicationComposerProps) {
  const label = mode === "comment" ? "Comment" : "Reply";

  return (
    <div
      aria-label={`${label} composer for ${article.author}`}
      className="mt-3 border-t border-slate-200 pt-3"
      role="form"
    >
      <TicketRichTextEditor
        autoFocus
        className="border-slate-200"
        disabled={disabled}
        id={`${mode}-${article.id}`}
        label={label}
        onChange={onBodyChange}
        onClose={onClose}
        placeholder={mode === "comment" ? "Write a comment..." : "Write a reply..."}
        value={body}
      />
    </div>
  );
}

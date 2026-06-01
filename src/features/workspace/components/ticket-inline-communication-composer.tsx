"use client";

import { cn } from "@/components/ui/classnames";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import { TicketRichTextEditor } from "./ticket-rich-text-editor";

export type InlineCommunicationMode = "comment" | "reply";

type InlineCommunicationComposerProps = {
  article: WorkspaceArticle;
  articleClassName: string;
  body: string;
  disabled: boolean;
  mode: InlineCommunicationMode;
  onBodyChange(body: string): void;
  onClose(): void;
  panelClassName: string;
};

export function TicketInlineCommunicationComposer({
  article,
  articleClassName,
  body,
  disabled,
  mode,
  onBodyChange,
  onClose,
  panelClassName,
}: InlineCommunicationComposerProps) {
  const label = mode === "comment" ? "Comment" : "Reply";

  return (
    <div
      aria-label={`${label} composer for ${article.author}`}
      className={cn("border-t px-4 py-3", articleClassName)}
      role="form"
    >
      <TicketRichTextEditor
        autoFocus
        className={panelClassName}
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

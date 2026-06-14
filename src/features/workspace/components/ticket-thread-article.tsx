"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/ui/classnames";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { RewriteDraftAction } from "@/features/ai";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import type { PersistedDraftAiSuggestion } from "./ticket-communication-draft-persistence";
import { TicketArticleAttachments } from "./ticket-article-attachments";
import {
  TicketInlineCommunicationComposer,
  type InlineCommunicationMode,
} from "./ticket-inline-communication-composer";
import {
  ArticleActions,
  ArticleAvatar,
  ArticleContactDetails,
  isPublicReplyableArticle,
} from "./ticket-thread-article-parts";
import {
  articleTypeLabel,
  articleTypeTokenClass,
} from "./ticket-thread-article-styles";
import { TicketArticleBody } from "./ticket-article-body";

type TicketThreadArticleProps = {
  activeMode: InlineCommunicationMode | null;
  article: WorkspaceArticle;
  communicationDraft: TicketCommunicationDraft;
  communicationCapabilities: TicketCommunicationCapabilities;
  disabled: boolean;
  draftRestored?: boolean;
  onCloseComposer(mode: InlineCommunicationMode): void;
  onComposerBodyChange(mode: InlineCommunicationMode, body: string): void;
  onOpenComposer(mode: InlineCommunicationMode): void;
  onSuggestionsChange(
    mode: InlineCommunicationMode,
    suggestions: PersistedDraftAiSuggestion[],
  ): void;
  rewriteDraftAction?: RewriteDraftAction;
  suggestions: PersistedDraftAiSuggestion[];
};

export function TicketThreadArticle({
  activeMode,
  article,
  communicationDraft,
  communicationCapabilities,
  disabled,
  draftRestored,
  onComposerBodyChange,
  onCloseComposer,
  onOpenComposer,
  onSuggestionsChange,
  rewriteDraftAction,
  suggestions,
}: TicketThreadArticleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasRecipientDetails =
    article.to.length > 0 || article.cc.length > 0 || article.bcc.length > 0;
  const canReply =
    communicationCapabilities.customerReplies && isPublicReplyableArticle(article);
  const canComment = communicationCapabilities.internalNotes;
  const hasActions = canReply || canComment;

  const senderControl = hasRecipientDetails ? (
    <button
      aria-expanded={isExpanded}
      aria-label={`Message details for ${article.author}`}
      className="inline-flex min-w-0 items-center gap-1 rounded-sm text-left font-semibold text-slate-950 hover:text-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
      onClick={() => setIsExpanded((current) => !current)}
      type="button"
    >
      <span className="truncate">{article.author}</span>
      <ChevronDown
        aria-hidden="true"
        className={cn(
          "size-4 shrink-0 text-slate-500 transition-transform",
          isExpanded ? "rotate-180" : "",
        )}
      />
    </button>
  ) : (
    <span className="min-w-0 truncate font-semibold text-slate-950">
      {article.author}
    </span>
  );

  return (
    <article
      aria-label={`${articleTypeLabel[article.direction]} from ${article.author}`}
      className="group bg-white transition-colors hover:bg-slate-50/70 focus-within:bg-slate-50/70"
    >
      <div
        className="relative flex gap-3 pb-4 pl-4 pr-4 pt-4"
      >
        <ArticleAvatar article={article} />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm",
              hasActions && "pr-40",
            )}
          >
            {senderControl}
            <span
              className={cn(
                "shrink-0 text-xs",
                articleTypeTokenClass[article.direction],
              )}
            >
              {articleTypeLabel[article.direction]}
            </span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span className="shrink-0 text-xs text-slate-500">
              {article.meta}
            </span>
          </div>
          {hasRecipientDetails && isExpanded ? (
            <ArticleContactDetails article={article} />
          ) : null}
          <TicketArticleBody html={article.sanitizedHtml} />
          <TicketArticleAttachments attachments={article.attachments} />
          {hasActions ? (
            <ArticleActions
              activeMode={activeMode}
              article={article}
              canComment={canComment}
              canReply={canReply}
              onOpenComposer={onOpenComposer}
            />
          ) : null}
          {activeMode ? (
            <TicketInlineCommunicationComposer
              article={article}
              body={
                activeMode === "comment"
                  ? communicationDraft.commentBody
                  : communicationDraft.replyBody
              }
              disabled={disabled}
              draftRestored={draftRestored}
              key={`${article.id}-${activeMode}`}
              mode={activeMode}
              onBodyChange={(body) => onComposerBodyChange(activeMode, body)}
              onClose={() => onCloseComposer(activeMode)}
              onSuggestionsChange={(nextSuggestions) =>
                onSuggestionsChange(activeMode, nextSuggestions)
              }
              rewriteDraftAction={rewriteDraftAction}
              suggestions={suggestions}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

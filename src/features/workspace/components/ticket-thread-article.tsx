"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/ui/classnames";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import { TicketArticleAttachments } from "./ticket-article-attachments";
import {
  ArticleActions,
  ArticleAvatar,
  ArticleContactDetails,
  isPublicReplyableArticle,
} from "./ticket-thread-article-parts";
import {
  articleRailClass,
  articleTypeLabel,
  articleTypeTokenClass,
} from "./ticket-thread-article-styles";
import { TicketArticleBody } from "./ticket-article-body";

type TicketThreadArticleProps = {
  activeForward: boolean;
  activeIntent: TicketReplyIntent | null;
  article: WorkspaceArticle;
  canForward: boolean;
  canReply: boolean;
  helpdeskConnectionId?: string;
  onForward(): void;
  onReply(intent: TicketReplyIntent): void;
  ticketExternalId: string;
};

export function TicketThreadArticle({
  activeForward,
  activeIntent,
  article,
  canForward,
  canReply,
  helpdeskConnectionId,
  onForward,
  onReply,
  ticketExternalId,
}: TicketThreadArticleProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasRecipientDetails =
    article.to.length > 0 || article.cc.length > 0 || article.bcc.length > 0;
  const hasActions = (canReply && isPublicReplyableArticle(article)) ||
    (canForward && Boolean(article.forwardContext));

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
      className="group border-b border-slate-200 bg-white transition-colors hover:bg-slate-50/40 focus-within:bg-slate-50/40"
    >
      <div
        className="relative flex gap-3 py-4 pl-8 pr-4"
      >
        <span
          aria-hidden="true"
          className={cn(
            "absolute bottom-4 left-4 top-4 w-px",
            articleRailClass[article.direction],
          )}
          data-article-direction={article.direction}
          data-article-rail=""
        />
        <ArticleAvatar article={article} />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm",
              hasActions && "pr-20",
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
          <TicketArticleAttachments
            articleExternalId={article.id}
            attachments={article.attachments}
            helpdeskConnectionId={helpdeskConnectionId}
            ticketExternalId={ticketExternalId}
          />
          {hasActions ? (
            <ArticleActions
              activeIntent={activeIntent}
              activeForward={activeForward}
              article={article}
              canForward={canForward}
              canReply={canReply}
              onForward={onForward}
              onReply={onReply}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

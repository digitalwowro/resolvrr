"use client";

import { ChevronRight } from "lucide-react";
import type {
  TicketConversationHistoryContext,
} from "@/core/ticket-conversation-history";
import {
  visibleTicketArticleMessageHtml,
} from "@/core/ticket-article-content";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";

function publicConversationArticles(
  articles: WorkspaceArticle[],
  context: TicketConversationHistoryContext,
  sourceArticleExternalId: string,
): WorkspaceArticle[] {
  const eligible = articles.filter((article) =>
    article.visibility === "public" &&
    (article.kind === undefined || article.kind === "message") &&
    (article.direction === "inbound" || article.direction === "outbound") &&
    Boolean(article.sanitizedHtml.trim()),
  );
  if (context.scope === "current") return eligible;
  const sourceIndex = eligible.findIndex((article) =>
    article.id === sourceArticleExternalId
  );
  return sourceIndex === -1 ? [] : eligible.slice(sourceIndex);
}

function ConversationArticle({ article }: { article: WorkspaceArticle }) {
  const visibleHtml = visibleTicketArticleMessageHtml(article.sanitizedHtml);
  return (
    <div className="border-t border-slate-100 py-3 first:border-t-0 first:pt-0">
      <p className="text-xs font-semibold text-slate-700">
        {article.author} · {article.meta}
      </p>
      <div
        className="mt-1 max-w-none overflow-x-auto break-words text-xs leading-5 text-slate-700 [&_a]:font-medium [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-slate-200 [&_blockquote]:pl-2 [&_img]:h-auto [&_img]:max-h-48 [&_img]:max-w-full [&_p]:mb-2 [&_p:last-child]:mb-0 [&_table]:max-w-full"
        dangerouslySetInnerHTML={{ __html: visibleHtml }}
      />
      {article.attachments.length ? (
        <p className="mt-1 text-xs text-slate-500">
          Attachments: {article.attachments.map((attachment) =>
            attachment.fileName
          ).join(", ")}
        </p>
      ) : null}
    </div>
  );
}

export function TicketConversationHistory({
  articles,
  context,
  disabled,
  included,
  onIncludedChange,
  sourceArticleExternalId,
}: {
  articles: WorkspaceArticle[];
  context: TicketConversationHistoryContext;
  disabled: boolean;
  included: boolean;
  onIncludedChange(included: boolean): void;
  sourceArticleExternalId: string;
}) {
  const previewArticles = publicConversationArticles(
    articles,
    context,
    sourceArticleExternalId,
  );
  const countLabel = `${context.messageCount} public ${
    context.messageCount === 1 ? "message" : "messages"
  }`;
  return (
    <div className="border-t border-slate-200">
      <div className="flex min-h-9 items-center gap-3 px-3 py-2">
        <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-slate-700">
          <input
            checked={included}
            disabled={disabled}
            onChange={(event) =>
              onIncludedChange(event.currentTarget.checked)
            }
            type="checkbox"
          />
          Include conversation history
        </label>
        <span className="ml-auto shrink-0 text-xs text-slate-400">
          {countLabel} · Read-only
        </span>
      </div>
      {included ? (
        <details className="group border-t border-slate-100">
          <summary className="flex h-9 cursor-pointer list-none items-center gap-1.5 px-3 text-xs font-medium text-slate-600 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-indigo-600 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              aria-hidden="true"
              className="size-3.5 transition-transform group-open:rotate-90"
            />
            Preview conversation history
          </summary>
          <div className="max-h-80 overflow-y-auto px-3 pb-3">
            {previewArticles.map((article) => (
              <ConversationArticle article={article} key={article.id} />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

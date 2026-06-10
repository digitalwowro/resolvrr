"use client";

import { ChevronDown, MessageSquarePlus, Reply, ReplyAll } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/components/ui/classnames";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type {
  WorkspaceArticle,
  WorkspaceArticleContact,
} from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import { TicketArticleAttachments } from "./ticket-article-attachments";
import {
  TicketInlineCommunicationComposer,
  type InlineCommunicationMode,
} from "./ticket-inline-communication-composer";
import {
  actionSelectedClass,
  actionStateClass,
  articleTypeLabel,
  articleTypeTokenClass,
  avatarClass,
} from "./ticket-thread-article-styles";

type TicketThreadArticleProps = {
  activeMode: InlineCommunicationMode | null;
  article: WorkspaceArticle;
  communicationDraft: TicketCommunicationDraft;
  communicationCapabilities: TicketCommunicationCapabilities;
  disabled: boolean;
  isFirst: boolean;
  onCommunicationDraftChange(draft: TicketCommunicationDraft): void;
  onCloseComposer(): void;
  onOpenComposer(mode: InlineCommunicationMode): void;
};

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function ContactLine({
  contacts,
  label,
}: {
  contacts: WorkspaceArticleContact[];
  label: string;
}) {
  if (contacts.length === 0) {
    return null;
  }

  return (
    <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-2">
      <span className="text-xs text-slate-500">{label}:</span>
      <div className="min-w-0 leading-tight text-slate-600">
        {contacts.map((contact, index) => (
          <span
            className="mr-2 inline-flex min-w-0 items-baseline gap-1"
            key={`${contact.label}-${contact.email ?? "no-email"}-${index}`}
          >
            <span className="truncate text-xs font-semibold">
              {contact.label}
            </span>
            {contact.email ? (
              <span className="truncate text-xs">({contact.email})</span>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
}

function ThreadActionButton({
  children,
  disabled,
  icon,
  isSelected,
  onClick,
  title,
  type,
}: {
  children: string;
  disabled?: boolean;
  icon: ReactNode;
  isSelected: boolean;
  onClick(): void;
  title?: string;
  type: WorkspaceArticle["direction"];
}) {
  return (
    <button
      aria-label={children}
      className={cn(
        "inline-grid size-7 place-items-center rounded-md text-slate-500",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected
          ? actionSelectedClass[type]
          : cn("bg-transparent", actionStateClass[type]),
      )}
      disabled={disabled}
      onClick={onClick}
      title={title ?? children}
      type="button"
    >
      {icon}
      <span className="sr-only">{children}</span>
    </button>
  );
}

function isPublicReplyableArticle(article: WorkspaceArticle) {
  return article.visibility === "public" &&
    (article.direction === "inbound" || article.direction === "outbound");
}

export function TicketThreadArticle({
  activeMode,
  article,
  communicationDraft,
  communicationCapabilities,
  disabled,
  isFirst,
  onCommunicationDraftChange,
  onCloseComposer,
  onOpenComposer,
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
        className={cn(
          "relative flex gap-3 pb-4 pr-4",
          isFirst ? "pt-0" : "pt-4",
        )}
      >
        <ArticleAvatar article={article} />
        <div className="min-w-0 flex-1">
          <div
            className={cn(
              "flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm",
              hasActions && "pr-28",
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
            <div className="mt-2 min-w-0 leading-tight">
              <ContactLine contacts={[article.from]} label="From" />
              <ContactLine contacts={article.to} label="To" />
              <ContactLine contacts={article.cc} label="Cc" />
              <ContactLine contacts={article.bcc} label="Bcc" />
            </div>
          ) : null}
          <div
            className={cn(
              "mt-2 max-w-none text-sm leading-5 text-slate-900",
              "whitespace-normal break-words",
              "[&_a]:font-medium [&_a]:underline-offset-2 [&_a:hover]:underline",
              "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-700",
              "[&_br]:block [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
              "[&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold",
              "[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:my-3 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-50 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
              "[&_strong]:font-semibold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold",
            )}
            dangerouslySetInnerHTML={{ __html: article.sanitizedHtml }}
          />
          <TicketArticleAttachments attachments={article.attachments} />
          {hasActions ? (
            <div
              aria-label={`Message actions for ${article.author}`}
              className="pointer-events-none absolute right-4 top-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
            >
              {canReply ? (
                <>
                  <ThreadActionButton
                    icon={<Reply aria-hidden="true" className="size-4" />}
                    isSelected={activeMode === "reply"}
                    onClick={() => onOpenComposer("reply")}
                    type={article.direction}
                  >
                    Reply
                  </ThreadActionButton>
                  <ThreadActionButton
                    disabled
                    icon={<ReplyAll aria-hidden="true" className="size-4" />}
                    isSelected={false}
                    onClick={() => undefined}
                    title="Reply all is not available yet."
                    type={article.direction}
                  >
                    Reply all
                  </ThreadActionButton>
                </>
              ) : null}
              {canComment ? (
                <ThreadActionButton
                  icon={
                    <MessageSquarePlus aria-hidden="true" className="size-4" />
                  }
                  isSelected={activeMode === "comment"}
                  onClick={() => onOpenComposer("comment")}
                  type={article.direction}
                >
                  Comment
                </ThreadActionButton>
              ) : null}
            </div>
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
              key={`${article.id}-${activeMode}`}
              mode={activeMode}
              onBodyChange={(body) =>
                onCommunicationDraftChange({
                  ...communicationDraft,
                  ...(activeMode === "comment"
                    ? { commentBody: body }
                    : { replyBody: body }),
                })
              }
              onClose={onCloseComposer}
            />
          ) : null}
        </div>
      </div>
    </article>
  );
}

function ArticleAvatar({ article }: { article: WorkspaceArticle }) {
  return (
    <div
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-full text-xs font-semibold",
        avatarClass[article.direction],
      )}
    >
      {initials(article.author)}
    </div>
  );
}

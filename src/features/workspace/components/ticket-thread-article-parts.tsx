"use client";

import { Reply, ReplyAll } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceArticle,
  WorkspaceArticleContact,
} from "@/features/tickets/workspace-adapter";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import {
  actionSelectedClass,
  actionStateClass,
  avatarClass,
} from "./ticket-thread-article-styles";

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
  const button = (
    <button
      aria-label={children}
      className={cn(
        "inline-grid size-7 place-items-center rounded-md border",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isSelected
          ? actionSelectedClass[type]
          : cn(
              "border-slate-200 bg-white",
              actionStateClass[type],
              "hover:border-slate-300",
            ),
      )}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
      <span className="sr-only">{children}</span>
    </button>
  );

  return (
    <Tooltip content={title ?? children} delayMs={150}>
      {button}
    </Tooltip>
  );
}

export function isPublicReplyableArticle(article: WorkspaceArticle) {
  return Boolean(article.replyContext?.availableIntents.includes("reply"));
}

export function ArticleAvatar({ article }: { article: WorkspaceArticle }) {
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

export function ArticleContactDetails({ article }: { article: WorkspaceArticle }) {
  return (
    <div className="mt-2 min-w-0 leading-tight">
      <ContactLine contacts={[article.from]} label="From" />
      <ContactLine contacts={article.to} label="To" />
      <ContactLine contacts={article.cc} label="Cc" />
      <ContactLine contacts={article.bcc} label="Bcc" />
    </div>
  );
}

export function ArticleActions({
  activeIntent,
  article,
  canReply,
  onReply,
}: {
  activeIntent: TicketReplyIntent | null;
  article: WorkspaceArticle;
  canReply: boolean;
  onReply(intent: TicketReplyIntent): void;
}) {
  const canReplyAll = Boolean(
    article.replyContext?.availableIntents.includes("reply-all"),
  );
  const showReplyAll = article.replyContext?.channel === "email";
  return (
    <div
      aria-label={`Message actions for ${article.author}`}
      className="pointer-events-none absolute right-4 top-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
    >
      {canReply ? <>
          <ThreadActionButton
            icon={<Reply aria-hidden="true" className="size-3.5" />}
            isSelected={activeIntent === "reply"}
            onClick={() => onReply("reply")}
            title="Reply to this message."
            type={article.direction}
          >
            Reply
          </ThreadActionButton>
          {showReplyAll ? <ThreadActionButton
            disabled={!canReplyAll}
            icon={<ReplyAll aria-hidden="true" className="size-4" />}
            isSelected={activeIntent === "reply-all"}
            onClick={() => onReply("reply-all")}
            title={canReplyAll
              ? "Reply to every external recipient on this message."
              : "This message has only one external recipient."}
            type={article.direction}
          >
            Reply all
          </ThreadActionButton> : null}
        </> : null}
    </div>
  );
}

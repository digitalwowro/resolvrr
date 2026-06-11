"use client";

import { MessageSquarePlus, Reply, ReplyAll } from "lucide-react";
import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceArticle,
  WorkspaceArticleContact,
} from "@/features/tickets/workspace-adapter";
import type { InlineCommunicationMode } from "./ticket-inline-communication-composer";
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
  prominence = "secondary",
  title,
  type,
}: {
  children: string;
  disabled?: boolean;
  icon: ReactNode;
  isSelected: boolean;
  onClick(): void;
  prominence?: "primary" | "secondary";
  title?: string;
  type: WorkspaceArticle["direction"];
}) {
  const isPrimary = prominence === "primary";

  const button = (
    <button
      aria-label={children}
      className={cn(
        isPrimary
          ? "inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-semibold"
          : "inline-grid size-7 place-items-center rounded-md border",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600",
        "disabled:cursor-not-allowed disabled:opacity-50",
        isPrimary
          ? "bg-slate-950 text-white hover:bg-slate-900 active:bg-slate-800"
          : isSelected
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
      {isPrimary ? (
        <span>{children}</span>
      ) : (
        <span className="sr-only">{children}</span>
      )}
    </button>
  );

  return isPrimary ? (
    button
  ) : (
    <Tooltip content={title ?? children} delayMs={150}>
      {button}
    </Tooltip>
  );
}

export function isPublicReplyableArticle(article: WorkspaceArticle) {
  return article.visibility === "public" &&
    (article.direction === "inbound" || article.direction === "outbound");
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
  activeMode,
  article,
  canComment,
  canReply,
  onOpenComposer,
}: {
  activeMode: InlineCommunicationMode | null;
  article: WorkspaceArticle;
  canComment: boolean;
  canReply: boolean;
  onOpenComposer(mode: InlineCommunicationMode): void;
}) {
  return (
    <div
      aria-label={`Message actions for ${article.author}`}
      className="pointer-events-none absolute right-4 top-4 flex items-center gap-1 opacity-0 transition-opacity group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100"
    >
      {canReply ? (
        <>
          <ThreadActionButton
            icon={<Reply aria-hidden="true" className="size-3.5" />}
            isSelected={activeMode === "reply"}
            onClick={() => onOpenComposer("reply")}
            prominence="primary"
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
          icon={<MessageSquarePlus aria-hidden="true" className="size-4" />}
          isSelected={activeMode === "comment"}
          onClick={() => onOpenComposer("comment")}
          prominence={canReply ? "secondary" : "primary"}
          type={article.direction}
        >
          Comment
        </ThreadActionButton>
      ) : null}
    </div>
  );
}

"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/ui/classnames";
import type {
  WorkspaceArticle,
  WorkspaceArticleContact,
} from "@/features/tickets";

type TicketThreadProps = {
  articles: WorkspaceArticle[];
};

const articleClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "border-indigo-100 bg-indigo-50/40",
  outbound: "border-slate-200 bg-slate-50/40",
  internal: "border-amber-200 bg-amber-50/40",
  system: "border-slate-200 bg-slate-50/40",
  unknown: "border-slate-200 bg-slate-50/40",
};

const avatarClass: Record<WorkspaceArticle["direction"], string> = {
  inbound: "bg-indigo-600 text-white",
  outbound: "bg-black text-white",
  internal: "bg-amber-600 text-white",
  system: "bg-slate-600 text-white",
  unknown: "bg-slate-600 text-white",
};

const articleTypeLabel: Record<WorkspaceArticle["direction"], string> = {
  inbound: "Customer reply",
  outbound: "Employee reply",
  internal: "Internal note",
  system: "System update",
  unknown: "Ticket article",
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
      <span className="text-xs">{label}:</span>
      <div className="min-w-0 leading-tight">
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

function ArticleCard({ article }: { article: WorkspaceArticle }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasRecipientDetails =
    article.to.length > 0 || article.cc.length > 0 || article.bcc.length > 0;

  const headerContent = (
    <>
      <div
        className="flex min-w-0 flex-1 items-baseline gap-2"
      >
        <span className="shrink-0 text-xs">From:</span>
        <span className="truncate text-xs font-semibold">
          {article.author}
        </span>
        {article.authorEmail ? (
          <span className="truncate text-xs">&lt;{article.authorEmail}&gt;</span>
        ) : null}
        <span className="shrink-0 text-xs">·</span>
        <span className="truncate text-xs">{article.meta}</span>
        {hasRecipientDetails ? (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              "size-4 shrink-0 self-center transition-transform",
              isExpanded ? "rotate-180" : "",
            )}
          />
        ) : null}
      </div>
      {hasRecipientDetails && isExpanded ? (
        <div className="min-w-0 leading-tight">
          <ContactLine contacts={article.to} label="To" />
          <ContactLine contacts={article.cc} label="Cc" />
          <ContactLine contacts={article.bcc} label="Bcc" />
        </div>
      ) : null}
    </>
  );

  return (
    <article
      aria-label={`${articleTypeLabel[article.direction]} from ${article.author}`}
      className={cn(
        "overflow-hidden rounded-md border",
        articleClass[article.direction],
      )}
    >
      <div>
        {hasRecipientDetails ? (
          <button
            aria-expanded={isExpanded}
            aria-label={`Message details for ${article.author}`}
            className="flex w-full items-start gap-3 px-3 pt-3 text-left"
            onClick={() => setIsExpanded((current) => !current)}
            type="button"
          >
            <div
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                avatarClass[article.direction],
              )}
            >
              {initials(article.author)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {headerContent}
            </div>
          </button>
        ) : (
          <div className="flex w-full items-center gap-3 px-3 pt-3 text-left">
            <div
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[10px] font-semibold",
                avatarClass[article.direction],
              )}
            >
              {initials(article.author)}
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              {headerContent}
            </div>
          </div>
        )}
      </div>
      <div className="px-3 py-3">
        <div
          className={cn(
            "max-w-none text-sm leading-5 text-slate-900",
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
      </div>
    </article>
  );
}

export function TicketThread({ articles }: TicketThreadProps) {
  if (articles.length === 0) {
    return (
      <div className="min-h-0 flex-1 overflow-auto px-4 py-4 text-sm text-slate-600">
        No ticket articles were returned by the active helpdesk workspace.
      </div>
    );
  }

  return (
    <div
      aria-label="Ticket replies"
      className="min-h-0 flex-1 space-y-4 overflow-auto px-4 py-4"
    >
      {articles.map((article) => (
        <ArticleCard article={article} key={article.id} />
      ))}
    </div>
  );
}

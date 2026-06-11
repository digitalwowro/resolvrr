"use client";

import { useMemo, useState } from "react";
import { cn } from "@/components/ui/classnames";
import {
  trimArticleBodyHtml,
  type ArticleBodyHiddenKind,
} from "./ticket-article-body-trim";

type TicketArticleBodyProps = {
  html: string;
};

const hiddenLabel: Record<ArticleBodyHiddenKind, string> = {
  "quoted-reply": "quoted reply",
  signature: "signature",
  "trimmed-content": "trimmed content",
};

const articleBodyClassName = cn(
  "mt-2 max-w-none text-sm leading-5 text-slate-900",
  "whitespace-normal break-words",
  "[&_a]:font-medium [&_a]:underline-offset-2 [&_a:hover]:underline",
  "[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-slate-300 [&_blockquote]:pl-3 [&_blockquote]:text-slate-700",
  "[&_br]:block [&_code]:rounded [&_code]:bg-slate-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[0.85em]",
  "[&_h1]:mb-2 [&_h1]:text-lg [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h3]:mb-2 [&_h3]:font-semibold",
  "[&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_pre]:my-3 [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-slate-950 [&_pre]:p-3 [&_pre]:text-slate-50 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-6",
  "[&_strong]:font-semibold [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-slate-200 [&_td]:p-2 [&_th]:border [&_th]:border-slate-200 [&_th]:bg-slate-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold",
);

export function TicketArticleBody({ html }: TicketArticleBodyProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const body = useMemo(() => trimArticleBodyHtml(html), [html]);

  if (!body.collapsed) {
    return (
      <div
        className={articleBodyClassName}
        dangerouslySetInnerHTML={{ __html: body.visibleHtml }}
      />
    );
  }

  const label = hiddenLabel[body.hiddenKind];

  return (
    <>
      <div
        className={articleBodyClassName}
        dangerouslySetInnerHTML={{ __html: body.visibleHtml }}
      />
      <button
        className="mt-2 inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 hover:underline focus-visible:rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => setIsExpanded((current) => !current)}
        type="button"
      >
        {isExpanded ? `Hide ${label}` : `Show ${label}`}
      </button>
      {isExpanded ? (
        <div
          className={cn(
            articleBodyClassName,
            "mt-2 border-l-2 border-slate-200 pl-3 text-slate-700",
          )}
          dangerouslySetInnerHTML={{ __html: body.hiddenHtml }}
        />
      ) : null}
    </>
  );
}

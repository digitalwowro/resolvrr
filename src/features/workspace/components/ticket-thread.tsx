"use client";

import { useEffect, useRef, useState } from "react";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import type { InlineCommunicationMode } from "./ticket-inline-communication-composer";
import { TicketThreadArticle } from "./ticket-thread-article";

type TicketThreadProps = {
  articles: WorkspaceArticle[];
  communicationDraft: TicketCommunicationDraft;
  communicationCapabilities: TicketCommunicationCapabilities;
  disabled: boolean;
  onCommunicationDraftChange(draft: TicketCommunicationDraft): void;
  onScrolledToLatest(): void;
  scrollAfterArticleCount?: number;
};

type ActiveComposer = {
  articleId: string;
  mode: InlineCommunicationMode;
};

export function TicketThread({
  articles,
  communicationDraft,
  communicationCapabilities,
  disabled,
  onCommunicationDraftChange,
  onScrolledToLatest,
  scrollAfterArticleCount,
}: TicketThreadProps) {
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);
  const latestArticleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (
      scrollAfterArticleCount === undefined ||
      articles.length <= scrollAfterArticleCount
    ) {
      return;
    }

    latestArticleRef.current?.scrollIntoView({
      block: "center",
      inline: "nearest",
      behavior: "smooth",
    });
    onScrolledToLatest();
  }, [articles.length, onScrolledToLatest, scrollAfterArticleCount]);

  return (
    <section className="pr-0">
      <div className="divide-y divide-slate-200">
        {articles.map((article, index) => {
          const latest = index === 0;
          return (
            <div key={article.id} ref={latest ? latestArticleRef : undefined}>
              <TicketThreadArticle
                activeMode={
                  activeComposer?.articleId === article.id
                    ? activeComposer.mode
                    : null
                }
                article={article}
                communicationDraft={communicationDraft}
                communicationCapabilities={communicationCapabilities}
                disabled={disabled}
                onCommunicationDraftChange={onCommunicationDraftChange}
                onCloseComposer={() => setActiveComposer(null)}
                onOpenComposer={(mode) =>
                  setActiveComposer({ articleId: article.id, mode })
                }
              />
            </div>
          );
        })}
        {articles.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No ticket thread is available.
          </div>
        ) : null}
      </div>
    </section>
  );
}

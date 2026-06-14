"use client";

import { useEffect, useRef, useState } from "react";
import type { RewriteDraftAction } from "@/features/ai";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import type { InlineCommunicationMode } from "./ticket-inline-communication-composer";
import { TicketThreadArticle } from "./ticket-thread-article";
import { isPublicReplyableArticle } from "./ticket-thread-article-parts";
import {
  clearPersistedCommunicationDrafts,
  loadPersistedCommunicationDrafts,
  pruneExpiredCommunicationDrafts,
  savePersistedCommunicationDraft,
  type CommunicationDraftPersistenceScope,
  type PersistedDraftAiSuggestion,
} from "./ticket-communication-draft-persistence";

type TicketThreadProps = {
  articles: WorkspaceArticle[];
  communicationDraft: TicketCommunicationDraft;
  communicationCapabilities: TicketCommunicationCapabilities;
  disabled: boolean;
  draftPersistenceScope?: CommunicationDraftPersistenceScope;
  onCommunicationDraftChange(draft: TicketCommunicationDraft): void;
  onScrolledToLatest(): void;
  rewriteDraftAction?: RewriteDraftAction;
  scrollAfterArticleCount?: number;
};

type ActiveComposer = {
  articleId: string;
  mode: InlineCommunicationMode;
};

function canOpenPersistedComposer(
  article: WorkspaceArticle,
  mode: InlineCommunicationMode,
  capabilities: TicketCommunicationCapabilities,
): boolean {
  return mode === "comment"
    ? capabilities.internalNotes
    : capabilities.customerReplies && isPublicReplyableArticle(article);
}

export function TicketThread({
  articles,
  communicationDraft,
  communicationCapabilities,
  disabled,
  draftPersistenceScope,
  onCommunicationDraftChange,
  onScrolledToLatest,
  rewriteDraftAction,
  scrollAfterArticleCount,
}: TicketThreadProps) {
  const [activeComposer, setActiveComposer] = useState<ActiveComposer | null>(null);
  const [restoredComposer, setRestoredComposer] = useState<ActiveComposer | null>(
    null,
  );
  const [suggestions, setSuggestions] = useState<
    Record<InlineCommunicationMode, PersistedDraftAiSuggestion[]>
  >({ comment: [], reply: [] });
  const latestArticleRef = useRef<HTMLDivElement | null>(null);
  const communicationDraftRef = useRef(communicationDraft);
  const communicationCapabilitiesRef = useRef(communicationCapabilities);
  const onCommunicationDraftChangeRef = useRef(onCommunicationDraftChange);
  const restoredScopeRef = useRef("");

  useEffect(() => {
    communicationDraftRef.current = communicationDraft;
  }, [communicationDraft]);

  useEffect(() => {
    communicationCapabilitiesRef.current = communicationCapabilities;
    onCommunicationDraftChangeRef.current = onCommunicationDraftChange;
  }, [communicationCapabilities, onCommunicationDraftChange]);

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

  useEffect(() => {
    void pruneExpiredCommunicationDrafts();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const scopeKey = draftPersistenceScope
      ? [
          draftPersistenceScope.userId,
          draftPersistenceScope.workspaceId,
          draftPersistenceScope.ticketExternalId,
        ].join(":")
      : "";
    if (!scopeKey || restoredScopeRef.current === scopeKey) {
      return;
    }
    restoredScopeRef.current = scopeKey;
    async function restoreDrafts() {
      const records =
        await loadPersistedCommunicationDrafts(draftPersistenceScope);
      if (cancelled || records.length === 0) {
        return;
      }

      const nextDraft = { ...communicationDraftRef.current };
      const nextSuggestions: Record<
        InlineCommunicationMode,
        PersistedDraftAiSuggestion[]
      > = { comment: [], reply: [] };
      for (const record of records) {
        if (record.mode === "comment") {
          nextDraft.commentBody = record.bodyHtml;
        } else {
          nextDraft.replyBody = record.bodyHtml;
        }
        nextSuggestions[record.mode] = record.suggestions;
      }
      const latestRecord = records[0];
      const matchingArticle = articles.find(
        (article) => article.id === latestRecord.articleId,
      );
      const restoredArticle =
        [matchingArticle, ...articles].find(
          (article): article is WorkspaceArticle => {
            if (!article) {
              return false;
            }
            return canOpenPersistedComposer(
              article,
              latestRecord.mode,
              communicationCapabilitiesRef.current,
            );
          },
        ) ?? null;
      if (restoredArticle) {
        const composer = {
          articleId: restoredArticle.id,
          mode: latestRecord.mode,
        };
        setSuggestions(nextSuggestions);
        setActiveComposer(composer);
        setRestoredComposer(composer);
      }
      onCommunicationDraftChangeRef.current(nextDraft);
    }

    void restoreDrafts();
    return () => {
      cancelled = true;
    };
  }, [
    articles,
    draftPersistenceScope,
  ]);

  function bodyForMode(mode: InlineCommunicationMode): string {
    return mode === "comment"
      ? communicationDraft.commentBody
      : communicationDraft.replyBody;
  }

  function updateBody(
    articleId: string,
    mode: InlineCommunicationMode,
    body: string,
  ) {
    const nextDraft = {
      ...communicationDraft,
      ...(mode === "comment" ? { commentBody: body } : { replyBody: body }),
    };
    onCommunicationDraftChange(nextDraft);
    void savePersistedCommunicationDraft({
      articleId,
      bodyHtml: body,
      mode,
      scope: draftPersistenceScope,
      suggestions: suggestions[mode],
    });
  }

  function updateSuggestions(
    articleId: string,
    mode: InlineCommunicationMode,
    nextSuggestions: PersistedDraftAiSuggestion[],
  ) {
    setSuggestions((current) => ({ ...current, [mode]: nextSuggestions }));
    void savePersistedCommunicationDraft({
      articleId,
      bodyHtml: bodyForMode(mode),
      mode,
      scope: draftPersistenceScope,
      suggestions: nextSuggestions,
    });
  }

  function closeComposer(mode: InlineCommunicationMode) {
    onCommunicationDraftChange({
      ...communicationDraft,
      ...(mode === "comment" ? { commentBody: "" } : { replyBody: "" }),
    });
    setSuggestions((current) => ({ ...current, [mode]: [] }));
    setActiveComposer(null);
    setRestoredComposer(null);
    void clearPersistedCommunicationDrafts(draftPersistenceScope, mode);
  }

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
                draftRestored={
                  restoredComposer?.articleId === article.id &&
                  restoredComposer.mode === activeComposer?.mode
                }
                onComposerBodyChange={(mode, body) =>
                  updateBody(article.id, mode, body)
                }
                onCloseComposer={(mode) => closeComposer(mode)}
                onOpenComposer={(mode) =>
                  setActiveComposer({ articleId: article.id, mode })
                }
                onSuggestionsChange={(mode, nextSuggestions) =>
                  updateSuggestions(article.id, mode, nextSuggestions)
                }
                rewriteDraftAction={rewriteDraftAction}
                suggestions={
                  activeComposer?.articleId === article.id && activeComposer.mode
                    ? suggestions[activeComposer.mode]
                    : []
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

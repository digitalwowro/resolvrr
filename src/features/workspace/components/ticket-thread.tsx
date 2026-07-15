"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { AiRephraseStyleOption, RewriteDraftAction } from "@/features/ai";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import { replyRecipientsEdited } from "./communication-draft";
import { forwardDraftEdited } from "./communication-draft";
import { TicketThreadArticle } from "./ticket-thread-article";
import { TicketInlineCommunicationComposer } from "./ticket-inline-communication-composer";
import { TicketReplyRecipientEditor } from "./ticket-reply-recipient-editor";
import { TicketForwardOptions } from "./ticket-forward-options";
import { restoredCommunicationDraft } from "./ticket-communication-draft-restore";
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
  communicationDraft?: TicketCommunicationDraft;
  communicationCapabilities: TicketCommunicationCapabilities;
  disabled: boolean;
  draftPersistenceScope?: CommunicationDraftPersistenceScope;
  managedAddresses: string[];
  onCommunicationDraftChange(draft: TicketCommunicationDraft | undefined): void;
  onRequestReply(article: WorkspaceArticle, intent: TicketReplyIntent): void;
  onRequestForward(article: WorkspaceArticle): void;
  onScrolledToLatest(): void;
  rephraseStyleOptions?: AiRephraseStyleOption[];
  rewriteDraftAction?: RewriteDraftAction;
  scrollAfterArticleCount?: number;
};

export function TicketThread({
  articles,
  communicationDraft,
  communicationCapabilities,
  disabled,
  draftPersistenceScope,
  managedAddresses,
  onCommunicationDraftChange,
  onRequestReply,
  onRequestForward,
  onScrolledToLatest,
  rephraseStyleOptions,
  rewriteDraftAction,
  scrollAfterArticleCount,
}: TicketThreadProps) {
  const [suggestions, setSuggestions] = useState<PersistedDraftAiSuggestion[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const latestArticleRef = useRef<HTMLDivElement | null>(null);
  const restoredScopeRef = useRef("");
  const draftRef = useRef(communicationDraft);
  const onDraftChangeRef = useRef(onCommunicationDraftChange);

  useEffect(() => { draftRef.current = communicationDraft; }, [communicationDraft]);
  useEffect(() => { onDraftChangeRef.current = onCommunicationDraftChange; }, [onCommunicationDraftChange]);
  useEffect(() => { void pruneExpiredCommunicationDrafts(); }, []);

  useEffect(() => {
    if (scrollAfterArticleCount === undefined || articles.length <= scrollAfterArticleCount) return;
    latestArticleRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    onScrolledToLatest();
  }, [articles.length, onScrolledToLatest, scrollAfterArticleCount]);

  useEffect(() => {
    let cancelled = false;
    const scopeKey = draftPersistenceScope
      ? `${draftPersistenceScope.userId}:${draftPersistenceScope.workspaceId}:${draftPersistenceScope.helpdeskConnectionId}:${draftPersistenceScope.identityVersion}:${draftPersistenceScope.ticketExternalId}`
      : "";
    if (!scopeKey || restoredScopeRef.current === scopeKey) return;
    restoredScopeRef.current = scopeKey;
    void loadPersistedCommunicationDrafts(draftPersistenceScope).then((records) => {
      if (cancelled || draftRef.current || !records[0]) return;
      const draft = restoredCommunicationDraft(records[0], articles, communicationCapabilities);
      if (!draft) return;
      setSuggestions(records[0].suggestions);
      setDraftRestored(true);
      onDraftChangeRef.current(draft);
    });
    return () => { cancelled = true; };
  }, [articles, communicationCapabilities, draftPersistenceScope]);

  function persist(
    draft: TicketCommunicationDraft,
    nextSuggestions = suggestions,
  ) {
    void savePersistedCommunicationDraft({
      articleId: draft.kind !== "internal-comment"
        ? draft.sourceArticleExternalId
        : undefined,
      attachmentExternalIds: draft.kind === "customer-forward"
        ? draft.attachmentExternalIds
        : undefined,
      bodyHtml: draft.body,
      cc: draft.kind !== "internal-comment" ? draft.cc : undefined,
      contextVersion: draft.kind !== "internal-comment"
        ? draft.contextVersion
        : undefined,
      intent: draft.kind === "customer-reply" ? draft.intent : undefined,
      includeOriginal: draft.kind === "customer-forward" ? draft.includeOriginal : undefined,
      kind: draft.kind,
      recipientEdited: draft.kind === "customer-reply"
        ? replyRecipientsEdited(draft)
        : draft.kind === "customer-forward" ? forwardDraftEdited(draft) : false,
      scope: draftPersistenceScope,
      suggestions: nextSuggestions,
      subject: draft.kind === "customer-forward" ? draft.subject : undefined,
      to: draft.kind !== "internal-comment" ? draft.to : undefined,
    });
  }

  function changeDraft(draft: TicketCommunicationDraft) {
    setDraftRestored(false);
    onCommunicationDraftChange(draft);
    persist(draft);
  }

  function closeComposer() {
    setSuggestions([]);
    setDraftRestored(false);
    onCommunicationDraftChange(undefined);
    void clearPersistedCommunicationDrafts(draftPersistenceScope);
  }

  const sourceArticle = communicationDraft?.kind !== "internal-comment" && communicationDraft
    ? articles.find((article) => article.id === communicationDraft.sourceArticleExternalId)
    : undefined;
  const mode = communicationDraft?.kind === "internal-comment"
    ? "comment"
    : communicationDraft?.kind === "customer-forward" ? "forward" : "reply";

  return (
    <section className="pr-0">
      {communicationDraft ? (
        <div
          className="relative bg-indigo-50/30"
          id="ticket-communication-composer"
        >
          <button
            aria-label="Close composer"
            className="absolute right-4 top-3 z-10 inline-grid size-7 place-items-center rounded-md border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onClick={closeComposer}
            type="button"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
          {communicationDraft.kind !== "internal-comment" ? (
            <div className="px-4 pb-1 pr-14 pt-3 text-xs text-slate-600">
              {communicationDraft.kind === "customer-forward" ? "Forwarding" : "Replying to"} {sourceArticle?.author ?? "selected message"} · {sourceArticle?.meta ?? ""}
              <div className="mt-2">
                <TicketReplyRecipientEditor
                  disabled={disabled}
                  draft={communicationDraft}
                  managedAddresses={managedAddresses}
                  onChange={changeDraft}
                />
              </div>
              {communicationDraft.kind === "customer-forward" ? (
                <TicketForwardOptions
                  article={sourceArticle}
                  disabled={disabled}
                  draft={communicationDraft}
                  onChange={changeDraft}
                />
              ) : null}
            </div>
          ) : (
            <div className="px-4 pr-14 pt-3 text-xs font-medium text-slate-600">
              Internal comment
            </div>
          )}
          <TicketInlineCommunicationComposer
            body={communicationDraft.body}
            disabled={disabled}
            draftRestored={draftRestored}
            editorId={communicationDraft.kind !== "internal-comment"
              ? communicationDraft.sourceArticleExternalId
              : "ticket"}
            key={`${communicationDraft.kind}-${sourceArticle?.id ?? "ticket"}`}
            mode={mode}
            onBodyChange={(body) => changeDraft({ ...communicationDraft, body })}
            onSuggestionsChange={(nextSuggestions) => {
              setSuggestions(nextSuggestions);
              persist(communicationDraft, nextSuggestions);
            }}
            rephraseStyleOptions={rephraseStyleOptions}
            rewriteDraftAction={rewriteDraftAction}
            suggestions={suggestions}
          />
        </div>
      ) : null}
      <div className="divide-y divide-slate-200">
        {articles.map((article, index) => (
          <div key={article.id} ref={index === 0 ? latestArticleRef : undefined}>
            <TicketThreadArticle
              activeIntent={communicationDraft?.kind === "customer-reply" &&
                communicationDraft.sourceArticleExternalId === article.id
                ? communicationDraft.intent
                : null}
              activeForward={communicationDraft?.kind === "customer-forward" &&
                communicationDraft.sourceArticleExternalId === article.id}
              article={article}
              canForward={Boolean(communicationCapabilities.customerForwards)}
              canReply={communicationCapabilities.customerReplies}
              onForward={() => onRequestForward(article)}
              onReply={(intent) => onRequestReply(article, intent)}
            />
          </div>
        ))}
        {articles.length === 0 ? (
          <div className="rounded-md border border-dashed border-slate-200 bg-white px-4 py-6 text-sm text-slate-500">
            No ticket thread is available.
          </div>
        ) : null}
      </div>
    </section>
  );
}

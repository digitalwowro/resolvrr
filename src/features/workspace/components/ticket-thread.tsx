"use client";

import { useEffect, useRef, useState } from "react";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { AiRephraseStyleOption, RewriteDraftAction } from "@/features/ai";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import { replyRecipientsEdited } from "./communication-draft";
import { TicketThreadArticle } from "./ticket-thread-article";
import { TicketInlineCommunicationComposer } from "./ticket-inline-communication-composer";
import { TicketReplyRecipientEditor } from "./ticket-reply-recipient-editor";
import {
  clearPersistedCommunicationDrafts,
  loadPersistedCommunicationDrafts,
  pruneExpiredCommunicationDrafts,
  savePersistedCommunicationDraft,
  type CommunicationDraftPersistenceScope,
  type PersistedDraftAiSuggestion,
  type PersistedCommunicationDraft,
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
  onScrolledToLatest(): void;
  rephraseStyleOptions?: AiRephraseStyleOption[];
  rewriteDraftAction?: RewriteDraftAction;
  scrollAfterArticleCount?: number;
};

function restoredDraft(
  record: PersistedCommunicationDraft,
  articles: WorkspaceArticle[],
  capabilities: TicketCommunicationCapabilities,
): TicketCommunicationDraft | undefined {
  const kind = record.kind ?? (record.mode === "comment"
    ? "internal-comment"
    : record.mode === "reply" ? "customer-reply" : undefined);
  if (kind === "internal-comment") {
    return capabilities.internalNotes
      ? { body: record.bodyHtml, kind }
      : undefined;
  }
  const sourceId = record.sourceArticleExternalId ?? record.articleId;
  const article = articles.find((item) => item.id === sourceId);
  const context = article?.replyContext;
  const intent = record.intent ?? "reply";
  if (
    kind !== "customer-reply" ||
    !capabilities.customerReplies ||
    !context ||
    !context.availableIntents.includes(intent) ||
    (record.contextVersion && record.contextVersion !== context.contextVersion)
  ) {
    return undefined;
  }
  const defaults = intent === "reply-all"
    ? context.defaults.replyAll
    : context.defaults.reply;
  if (!defaults) return undefined;
  const defaultTo = defaults.to.map((recipient) => recipient.email);
  const defaultCc = defaults.cc.map((recipient) => recipient.email);
  return {
    body: record.bodyHtml,
    cc: record.contextVersion ? record.cc ?? defaultCc : defaultCc,
    contextVersion: context.contextVersion,
    defaultCc,
    defaultTo,
    intent,
    kind,
    sourceArticleExternalId: context.sourceArticleExternalId,
    to: record.contextVersion ? record.to ?? defaultTo : defaultTo,
  };
}

export function TicketThread({
  articles,
  communicationDraft,
  communicationCapabilities,
  disabled,
  draftPersistenceScope,
  managedAddresses,
  onCommunicationDraftChange,
  onRequestReply,
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
      ? `${draftPersistenceScope.userId}:${draftPersistenceScope.workspaceId}:${draftPersistenceScope.ticketExternalId}`
      : "";
    if (!scopeKey || restoredScopeRef.current === scopeKey) return;
    restoredScopeRef.current = scopeKey;
    void loadPersistedCommunicationDrafts(draftPersistenceScope).then((records) => {
      if (cancelled || draftRef.current || !records[0]) return;
      const draft = restoredDraft(records[0], articles, communicationCapabilities);
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
      articleId: draft.kind === "customer-reply"
        ? draft.sourceArticleExternalId
        : undefined,
      bodyHtml: draft.body,
      cc: draft.kind === "customer-reply" ? draft.cc : undefined,
      contextVersion: draft.kind === "customer-reply"
        ? draft.contextVersion
        : undefined,
      intent: draft.kind === "customer-reply" ? draft.intent : undefined,
      kind: draft.kind,
      recipientEdited: draft.kind === "customer-reply"
        ? replyRecipientsEdited(draft)
        : false,
      scope: draftPersistenceScope,
      suggestions: nextSuggestions,
      to: draft.kind === "customer-reply" ? draft.to : undefined,
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

  const sourceArticle = communicationDraft?.kind === "customer-reply"
    ? articles.find((article) => article.id === communicationDraft.sourceArticleExternalId)
    : undefined;
  const mode = communicationDraft?.kind === "internal-comment" ? "comment" : "reply";

  return (
    <section className="pr-0">
      {communicationDraft ? (
        <div id="ticket-communication-composer">
          {communicationDraft.kind === "customer-reply" ? (
            <div className="bg-indigo-50/30 px-4 pt-3 text-xs text-slate-600">
              Replying to {sourceArticle?.author ?? "selected message"} · {sourceArticle?.meta ?? ""}
              <div className="mt-2">
                <TicketReplyRecipientEditor
                  disabled={disabled}
                  draft={communicationDraft}
                  managedAddresses={managedAddresses}
                  onChange={changeDraft}
                />
              </div>
            </div>
          ) : null}
          <TicketInlineCommunicationComposer
            body={communicationDraft.body}
            disabled={disabled}
            draftRestored={draftRestored}
            editorId={communicationDraft.kind === "customer-reply"
              ? communicationDraft.sourceArticleExternalId
              : "ticket"}
            key={`${communicationDraft.kind}-${sourceArticle?.id ?? "ticket"}`}
            mode={mode}
            onBodyChange={(body) => changeDraft({ ...communicationDraft, body })}
            onClose={closeComposer}
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
              article={article}
              canReply={communicationCapabilities.customerReplies}
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

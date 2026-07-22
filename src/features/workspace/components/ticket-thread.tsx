"use client";

import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { TicketConversationHistoryContext } from "@/core/ticket-conversation-history";
import type { AiRephraseStyleOption, RewriteDraftAction } from "@/features/ai";
import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import type { TicketSignaturePreviewState } from "./use-ticket-signature-preview";
import { TicketThreadArticle } from "./ticket-thread-article";
import { TicketInlineCommunicationComposer } from "./ticket-inline-communication-composer";
import { TicketReplyRecipientEditor } from "./ticket-reply-recipient-editor";
import { TicketForwardOptions } from "./ticket-forward-options";
import { TicketThreadConversationHistory } from "./ticket-thread-conversation-history";
import { restoredCommunicationDraft } from "./ticket-communication-draft-restore";
import {
  clearPersistedCommunicationDrafts,
  savePersistedCommunicationDraft,
  type CommunicationDraftPersistenceScope,
  type PersistedDraftAiSuggestion,
} from "./ticket-communication-draft-persistence";
import {
  draftPersistenceInput,
} from "./communication-draft-serialization";
import {
  useWorkspaceCommunicationDraft,
} from "./workspace-communication-draft-context";
import { CommunicationDraftStorageStatus } from "./communication-draft-storage-status";

type TicketThreadProps = {
  articles: WorkspaceArticle[];
  communicationDraft?: TicketCommunicationDraft;
  communicationCapabilities: TicketCommunicationCapabilities;
  conversationHistory?: TicketConversationHistoryContext;
  disabled: boolean;
  draftPersistenceScope?: CommunicationDraftPersistenceScope;
  helpdeskConnectionId?: string;
  managedAddresses: string[];
  mentionGroupExternalId?: string;
  onCommunicationDraftChange(draft: TicketCommunicationDraft | undefined): void;
  onRequestReply(article: WorkspaceArticle, intent: TicketReplyIntent): void;
  onRequestForward(article: WorkspaceArticle): void;
  onScrolledToLatest(): void;
  rephraseStyleOptions?: AiRephraseStyleOption[];
  rewriteDraftAction?: RewriteDraftAction;
  scrollAfterArticleCount?: number;
  signaturePreview?: TicketSignaturePreviewState;
  ticketExternalId: string;
  onRetrySignaturePreview?(): void;
};

export function TicketThread({
  articles,
  communicationDraft,
  communicationCapabilities,
  conversationHistory,
  disabled,
  draftPersistenceScope,
  helpdeskConnectionId,
  managedAddresses,
  mentionGroupExternalId,
  onCommunicationDraftChange,
  onRequestReply,
  onRequestForward,
  onScrolledToLatest,
  rephraseStyleOptions,
  rewriteDraftAction,
  scrollAfterArticleCount,
  signaturePreview,
  ticketExternalId,
  onRetrySignaturePreview,
}: TicketThreadProps) {
  const [suggestions, setSuggestions] = useState<PersistedDraftAiSuggestion[]>([]);
  const [draftRestored, setDraftRestored] = useState(false);
  const latestArticleRef = useRef<HTMLDivElement | null>(null);
  const restoredRevisionRef = useRef(0);
  const draftRef = useRef(communicationDraft);
  const onDraftChangeRef = useRef(onCommunicationDraftChange);
  const { controller, entry } = useWorkspaceCommunicationDraft(ticketExternalId);

  useEffect(() => { draftRef.current = communicationDraft; }, [communicationDraft]);
  useEffect(() => { onDraftChangeRef.current = onCommunicationDraftChange; }, [onCommunicationDraftChange]);
  useEffect(() => () => {
    if (controller) void controller.flush(ticketExternalId);
  }, [controller, ticketExternalId]);
  useEffect(() => {
    if (scrollAfterArticleCount === undefined || articles.length <= scrollAfterArticleCount) return;
    latestArticleRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    onScrolledToLatest();
  }, [articles.length, onScrolledToLatest, scrollAfterArticleCount]);

  useLayoutEffect(() => {
    const record = entry.record;
    if (
      !entry.loaded ||
      !record ||
      restoredRevisionRef.current === record.localRevision
    ) return;
    restoredRevisionRef.current = record.localRevision;
    if (draftRef.current) return;
    setSuggestions(record.suggestions);
    const draft = restoredCommunicationDraft(
      record,
      articles,
      communicationCapabilities,
      conversationHistory,
    );
    if (!draft) return;
    queueMicrotask(() => setDraftRestored(true));
    onDraftChangeRef.current(draft);
  }, [
    articles,
    communicationCapabilities,
    conversationHistory,
    entry.loaded,
    entry.record,
  ]);

  function persist(
    draft: TicketCommunicationDraft,
    nextSuggestions = suggestions,
  ) {
    if (!draftPersistenceScope) return;
    const input = draftPersistenceInput({
      draft,
      scope: draftPersistenceScope,
      suggestions: nextSuggestions,
    });
    if (controller) controller.save(input);
    else void savePersistedCommunicationDraft(input);
  }

  function changeDraft(draft: TicketCommunicationDraft) {
    setDraftRestored(false);
    onCommunicationDraftChange(draft);
    persist(draft);
  }

  async function closeComposer() {
    if (controller) {
      if (!await controller.clear(ticketExternalId)) return;
    } else if (draftPersistenceScope) {
      const cleared = await clearPersistedCommunicationDrafts(
        draftPersistenceScope,
      );
      if (cleared.status === "unavailable") return;
    }
    setSuggestions([]);
    setDraftRestored(false);
    onCommunicationDraftChange(undefined);
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
          className="bg-indigo-50/30"
          id="ticket-communication-composer"
        >
          <div className="flex min-w-0 items-start justify-between gap-3 px-4 pt-3 text-xs text-slate-600">
            <span className="min-w-0 truncate font-medium">
              {communicationDraft.kind === "internal-comment"
                ? "Internal comment"
                : `${communicationDraft.kind === "customer-forward" ? "Forwarding" : "Replying to"} ${sourceArticle?.author ?? "selected message"} · ${sourceArticle?.meta ?? ""}`}
            </span>
            <CommunicationDraftStorageStatus
              entry={entry}
            />
            <button
              aria-label="Close composer"
              className="inline-grid size-7 shrink-0 place-items-center rounded-md border border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={disabled}
              onClick={() => void closeComposer()}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>
          {communicationDraft.kind !== "internal-comment" ? (
            <div className="px-4 pb-3 pt-2 text-xs text-slate-600">
              <TicketReplyRecipientEditor
                disabled={disabled}
                draft={communicationDraft}
                managedAddresses={managedAddresses}
                onChange={changeDraft}
              />
              {communicationDraft.kind === "customer-forward" ? (
                <div className="mt-2">
                  <TicketForwardOptions
                    article={sourceArticle}
                    disabled={disabled}
                    draft={communicationDraft}
                    onChange={changeDraft}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
          <TicketInlineCommunicationComposer
            body={communicationDraft.body}
            conversationHistoryFooter={
              communicationDraft.kind !== "internal-comment" ? (
                <TicketThreadConversationHistory
                  articles={articles}
                  disabled={disabled}
                  draft={communicationDraft}
                  onChange={changeDraft}
                />
              ) : undefined
            }
            disabled={disabled}
            draftRestored={draftRestored}
            editorId={communicationDraft.kind !== "internal-comment"
              ? communicationDraft.sourceArticleExternalId
              : "ticket"}
            key={`${communicationDraft.kind}-${sourceArticle?.id ?? "ticket"}`}
            mode={mode}
            mentionGroupExternalId={mentionGroupExternalId}
            onBodyChange={(body) => changeDraft({ ...communicationDraft, body })}
            onSuggestionsChange={(nextSuggestions) => {
              setSuggestions(nextSuggestions);
              persist(communicationDraft, nextSuggestions);
            }}
            rephraseStyleOptions={rephraseStyleOptions}
            rewriteDraftAction={rewriteDraftAction}
            signaturePreview={signaturePreview}
            onRetrySignaturePreview={onRetrySignaturePreview}
            suggestions={suggestions}
          />
        </div>
      ) : null}
      <div>
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
              helpdeskConnectionId={helpdeskConnectionId}
              isLast={index === articles.length - 1}
              onForward={() => onRequestForward(article)}
              onReply={(intent) => onRequestReply(article, intent)}
              ticketExternalId={ticketExternalId}
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

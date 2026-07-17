"use client";

import type { DraftRewriteOperation } from "@/features/ai";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { TicketSignatureSelection } from "@/core/ticket-signatures";
import {
  enqueueCommunicationDraftStorage,
  setCurrentCommunicationDraftPresence,
  type CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";
export type {
  CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";

const databaseName = "resolvrr-workspace-drafts";
const storeName = "communicationDrafts";
const databaseVersion = 5;
export const communicationDraftRetentionMs = 7 * 24 * 60 * 60 * 1_000;
export const maxPersistedAiSuggestions = 3;

export type PersistedDraftAiSuggestion = {
  generatedAt: string;
  id: string;
  label: string;
  operation: DraftRewriteOperation;
  rephraseStyleId?: string;
  text: string;
};

export type PersistedCommunicationDraft = {
  articleId?: string;
  attachmentExternalIds?: string[];
  bodyHtml: string;
  cc?: string[];
  contextVersion?: string;
  expiresAt: number;
  id: string;
  intent?: TicketReplyIntent;
  includeOriginal?: boolean;
  kind?: "internal-comment" | "customer-forward" | "customer-reply";
  mode?: "comment" | "reply";
  scope: CommunicationDraftPersistenceScope;
  sourceArticleExternalId?: string;
  suggestions: PersistedDraftAiSuggestion[];
  signatureContext?: TicketSignatureSelection;
  subject?: string;
  to?: string[];
  updatedAt: number;
};

function storageAvailable() {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function draftId(scope: CommunicationDraftPersistenceScope): string {
  return [
    "v5",
    scope.userId,
    scope.workspaceId,
    scope.helpdeskConnectionId,
    scope.identityVersion,
    scope.ticketExternalId,
  ].join(":");
}

function openDraftDatabase(): Promise<IDBDatabase | null> {
  if (!storageAvailable()) return Promise.resolve(null);
  return new Promise((resolve) => {
    const request = window.indexedDB.open(databaseName, databaseVersion);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id" });
      }
    };
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T | null> {
  const database = await openDraftDatabase();
  if (!database) return null;
  return new Promise((resolve) => {
    const transaction = database.transaction(storeName, mode);
    let requestResult: T | null = null;
    let settled = false;
    const finish = (result: T | null) => {
      if (settled) return;
      settled = true;
      database.close();
      resolve(result);
    };
    try {
      const request = callback(transaction.objectStore(storeName));
      request.onsuccess = () => {
        requestResult = request.result;
      };
      request.onerror = () => {
        requestResult = null;
      };
      transaction.oncomplete = () => finish(requestResult);
      transaction.onerror = () => finish(null);
      transaction.onabort = () => finish(null);
    } catch {
      transaction.abort();
      finish(null);
    }
  });
}

export function communicationDraftMatchesScope(
  left: unknown,
  right: CommunicationDraftPersistenceScope,
) {
  if (!left || typeof left !== "object") return false;
  const candidate = left as Partial<CommunicationDraftPersistenceScope>;
  return candidate.userId === right.userId &&
    candidate.workspaceId === right.workspaceId &&
    candidate.helpdeskConnectionId === right.helpdeskConnectionId &&
    candidate.identityVersion === right.identityVersion &&
    candidate.ticketExternalId === right.ticketExternalId;
}

export async function loadPersistedCommunicationDrafts(
  scope: CommunicationDraftPersistenceScope | undefined,
): Promise<PersistedCommunicationDraft[]> {
  if (!scope) return [];
  const records = await enqueueCommunicationDraftStorage(() =>
    withStore<PersistedCommunicationDraft[]>(
      "readonly",
      (store) => store.getAll(),
    )
  );
  const now = Date.now();
  const matching = (records ?? []).filter(
    (record) => communicationDraftMatchesScope(record.scope, scope) && record.expiresAt > now,
  );
  if ((records ?? []).some((record) => record.expiresAt <= now)) {
    void pruneExpiredCommunicationDrafts();
  }
  return matching.sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function savePersistedCommunicationDraft(input: {
  articleId?: string;
  attachmentExternalIds?: string[];
  bodyHtml: string;
  cc?: string[];
  contextVersion?: string;
  intent?: TicketReplyIntent;
  includeOriginal?: boolean;
  kind: "internal-comment" | "customer-forward" | "customer-reply";
  recipientEdited?: boolean;
  scope: CommunicationDraftPersistenceScope | undefined;
  suggestions: PersistedDraftAiSuggestion[];
  signatureContext?: TicketSignatureSelection;
  subject?: string;
  to?: string[];
}): Promise<void> {
  const scope = input.scope;
  if (!scope) return;
  const suggestions = input.suggestions.slice(0, maxPersistedAiSuggestions);
  const present = Boolean(
    input.bodyHtml.trim() ||
    suggestions.length > 0 ||
    input.recipientEdited,
  );
  setCurrentCommunicationDraftPresence(scope, present);
  if (!present) {
    await enqueueCommunicationDraftStorage(() =>
      withStore("readwrite", (store) => store.delete(draftId(scope)))
    );
    return;
  }
  const now = Date.now();
  await enqueueCommunicationDraftStorage(() =>
    withStore("readwrite", (store) => store.put({
      bodyHtml: input.bodyHtml,
      attachmentExternalIds: input.attachmentExternalIds,
      cc: input.cc,
      contextVersion: input.contextVersion,
      expiresAt: now + communicationDraftRetentionMs,
      id: draftId(scope),
      intent: input.intent,
      includeOriginal: input.includeOriginal,
      kind: input.kind,
      scope,
      sourceArticleExternalId: input.articleId,
      suggestions,
      signatureContext: input.signatureContext,
      subject: input.subject,
      to: input.to,
      updatedAt: now,
    } satisfies PersistedCommunicationDraft))
  );
}

export async function clearPersistedCommunicationDrafts(
  scope: CommunicationDraftPersistenceScope | undefined,
): Promise<void> {
  if (!scope) return;
  setCurrentCommunicationDraftPresence(scope, false);
  await enqueueCommunicationDraftStorage(
    () => withStore("readwrite", (store) => store.delete(draftId(scope))),
  );
}

export async function pruneExpiredCommunicationDrafts(): Promise<void> {
  await enqueueCommunicationDraftStorage(async () => {
    const records = await withStore<PersistedCommunicationDraft[]>(
      "readonly",
      (store) => store.getAll(),
    );
    const now = Date.now();
    await Promise.all(
      (records ?? [])
        .filter((record) => record.expiresAt <= now)
        .map((record) => withStore("readwrite", (store) => store.delete(record.id))),
    );
  });
}

"use client";

import type {
  DraftRephraseMode,
  DraftRewriteOperation,
} from "@/features/ai";

const databaseName = "resolvrr-workspace-drafts";
const storeName = "communicationDrafts";
const databaseVersion = 1;
export const communicationDraftRetentionMs = 7 * 24 * 60 * 60 * 1_000;
export const maxPersistedAiSuggestions = 3;

export type CommunicationDraftPersistenceScope = {
  ticketExternalId: string;
  userId: string;
  workspaceId: string;
};

export type PersistedDraftAiSuggestion = {
  generatedAt: string;
  id: string;
  label: string;
  operation: DraftRewriteOperation;
  rephraseMode?: DraftRephraseMode;
  text: string;
};

export type PersistedCommunicationDraft = {
  articleId: string;
  bodyHtml: string;
  expiresAt: number;
  id: string;
  mode: "comment" | "reply";
  scope: CommunicationDraftPersistenceScope;
  suggestions: PersistedDraftAiSuggestion[];
  updatedAt: number;
};

function storageAvailable(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function draftId(
  scope: CommunicationDraftPersistenceScope,
  mode: PersistedCommunicationDraft["mode"],
): string {
  return [
    "v1",
    scope.userId,
    scope.workspaceId,
    scope.ticketExternalId,
    mode,
  ].join(":");
}

function openDraftDatabase(): Promise<IDBDatabase | null> {
  if (!storageAvailable()) {
    return Promise.resolve(null);
  }

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
  if (!database) {
    return null;
  }

  return new Promise((resolve) => {
    const transaction = database.transaction(storeName, mode);
    const request = callback(transaction.objectStore(storeName));
    request.onerror = () => resolve(null);
    request.onsuccess = () => resolve(request.result);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => database.close();
  });
}

function sameScope(
  left: CommunicationDraftPersistenceScope,
  right: CommunicationDraftPersistenceScope,
): boolean {
  return (
    left.userId === right.userId &&
    left.workspaceId === right.workspaceId &&
    left.ticketExternalId === right.ticketExternalId
  );
}

export async function loadPersistedCommunicationDrafts(
  scope: CommunicationDraftPersistenceScope | undefined,
): Promise<PersistedCommunicationDraft[]> {
  if (!scope) {
    return [];
  }

  const records = await withStore<PersistedCommunicationDraft[]>(
    "readonly",
    (store) => store.getAll(),
  );
  const now = Date.now();
  const matching = (records ?? []).filter(
    (record) => sameScope(record.scope, scope) && record.expiresAt > now,
  );

  if ((records ?? []).some((record) => record.expiresAt <= now)) {
    void pruneExpiredCommunicationDrafts();
  }

  return matching.sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function savePersistedCommunicationDraft(input: {
  articleId: string;
  bodyHtml: string;
  mode: PersistedCommunicationDraft["mode"];
  scope: CommunicationDraftPersistenceScope | undefined;
  suggestions: PersistedDraftAiSuggestion[];
}): Promise<void> {
  if (!input.scope) {
    return;
  }

  const suggestions = input.suggestions.slice(0, maxPersistedAiSuggestions);
  if (!input.bodyHtml.trim() && suggestions.length === 0) {
    await clearPersistedCommunicationDrafts(input.scope, input.mode);
    return;
  }

  const now = Date.now();
  const record: PersistedCommunicationDraft = {
    articleId: input.articleId,
    bodyHtml: input.bodyHtml,
    expiresAt: now + communicationDraftRetentionMs,
    id: draftId(input.scope, input.mode),
    mode: input.mode,
    scope: input.scope,
    suggestions,
    updatedAt: now,
  };

  await withStore("readwrite", (store) => store.put(record));
}

export async function clearPersistedCommunicationDrafts(
  scope: CommunicationDraftPersistenceScope | undefined,
  mode?: PersistedCommunicationDraft["mode"],
): Promise<void> {
  if (!scope) {
    return;
  }

  if (mode) {
    await withStore("readwrite", (store) => store.delete(draftId(scope, mode)));
    return;
  }

  await Promise.all([
    clearPersistedCommunicationDrafts(scope, "comment"),
    clearPersistedCommunicationDrafts(scope, "reply"),
  ]);
}

export async function pruneExpiredCommunicationDrafts(): Promise<void> {
  const records = await withStore<PersistedCommunicationDraft[]>(
    "readonly",
    (store) => store.getAll(),
  );
  const now = Date.now();
  await Promise.all(
    (records ?? [])
      .filter((record) => record.expiresAt <= now)
      .map((record) =>
        withStore("readwrite", (store) => store.delete(record.id)),
      ),
  );
}

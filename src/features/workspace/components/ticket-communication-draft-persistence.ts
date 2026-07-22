"use client";

import type { DraftRewriteOperation } from "@/features/ai";
import type { TicketReplyIntent } from "@/core/ticket-replies";
import type { TicketSignatureSelection } from "@/core/ticket-signatures";
import type {
  TicketConversationHistoryScope,
} from "@/core/ticket-conversation-history";
import {
  type CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";
import type { EditorRewriteSelection } from "./ticket-rich-text-editor-selection";
import {
  deleteDraftStorageRecord,
  draftStorageUnavailableReason,
  putDraftStorageRecord,
  readDraftStorageRecord,
} from "./ticket-communication-draft-indexeddb";
export type {
  CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";

export const maxPersistedAiSuggestions = 3;

export type PersistedDraftAiSuggestion = {
  generatedAt: string;
  id: string;
  label: string;
  operation: DraftRewriteOperation;
  rephraseStyleId?: string;
  target?:
    | { kind: "draft" }
    | { kind: "selection"; selection: EditorRewriteSelection };
  text: string;
};

export type PersistedCommunicationDraft = {
  articleId?: string;
  attachmentExternalIds?: string[];
  bodyHtml: string;
  cc?: string[];
  conversationHistoryContextVersion?: string;
  conversationHistoryScope?: TicketConversationHistoryScope;
  contextVersion?: string;
  /** Legacy version 8 field, retained only while reading older browser records. */
  expiresAt?: number;
  id: string;
  intent?: TicketReplyIntent;
  /** Legacy version 7 Forward field, read only during draft restoration. */
  includeOriginal?: boolean;
  includeConversationHistory?: boolean;
  kind?: "internal-comment" | "customer-forward" | "customer-reply";
  mode?: "comment" | "reply";
  pendingClear?: boolean;
  scope: CommunicationDraftPersistenceScope;
  localRevision: number;
  sourceArticleExternalId?: string;
  suggestions: PersistedDraftAiSuggestion[];
  signatureContext?: TicketSignatureSelection;
  subject?: string;
  to?: string[];
  updatedAt: number;
};

export type CommunicationDraftStorageResult<T> =
  | { status: "available"; value: T }
  | { status: "unavailable"; reason: "indexeddb-unavailable" | "storage-failed" };

export type SavePersistedCommunicationDraftInput = {
  articleId?: string;
  attachmentExternalIds?: string[];
  bodyHtml: string;
  cc?: string[];
  conversationHistoryContextVersion?: string;
  conversationHistoryScope?: TicketConversationHistoryScope;
  contextVersion?: string;
  intent?: TicketReplyIntent;
  includeConversationHistory?: boolean;
  kind: "internal-comment" | "customer-forward" | "customer-reply";
  localRevision?: number;
  recipientEdited?: boolean;
  scope: CommunicationDraftPersistenceScope | undefined;
  signatureContext?: TicketSignatureSelection;
  suggestions: PersistedDraftAiSuggestion[];
  subject?: string;
  to?: string[];
};

function draftId(scope: CommunicationDraftPersistenceScope): string {
  return [
    "v6",
    scope.userId,
    scope.workspaceId,
    scope.helpdeskConnectionId,
    scope.identityVersion,
    scope.ticketExternalId,
  ].join(":");
}

export async function readPersistedCommunicationDraft(
  scope: CommunicationDraftPersistenceScope,
): Promise<CommunicationDraftStorageResult<PersistedCommunicationDraft | undefined>> {
  try {
    const record = await readDraftStorageRecord<PersistedCommunicationDraft>(
      draftId(scope),
    );
    return {
      status: "available",
      value: record && communicationDraftMatchesScope(record.scope, scope)
        ? normalizedRecord(record)
        : undefined,
    };
  } catch (error) {
    return { status: "unavailable", reason: draftStorageUnavailableReason(error) };
  }
}

function normalizedRecord(
  record: PersistedCommunicationDraft,
): PersistedCommunicationDraft {
  return {
    ...record,
    localRevision: record.localRevision ?? 1,
  };
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
  const result = await readPersistedCommunicationDraft(scope);
  return result.status === "available" && result.value ? [result.value] : [];
}

export function persistedCommunicationDraftFromInput(
  input: SavePersistedCommunicationDraftInput,
): PersistedCommunicationDraft | undefined {
  const scope = input.scope;
  if (!scope) return undefined;
  const suggestions = input.suggestions.slice(0, maxPersistedAiSuggestions);
  const present = Boolean(
    input.bodyHtml.trim() ||
    suggestions.length > 0 ||
    input.recipientEdited,
  );
  if (!present) return undefined;
  const now = Date.now();
  return {
    bodyHtml: input.bodyHtml,
    attachmentExternalIds: input.attachmentExternalIds,
    cc: input.cc,
    conversationHistoryContextVersion:
      input.conversationHistoryContextVersion,
    conversationHistoryScope: input.conversationHistoryScope,
    contextVersion: input.contextVersion,
    id: draftId(scope),
    intent: input.intent,
    includeConversationHistory: input.includeConversationHistory,
    kind: input.kind,
    localRevision: input.localRevision ?? 1,
    scope,
    sourceArticleExternalId: input.articleId,
    suggestions,
    signatureContext: input.signatureContext,
    subject: input.subject,
    to: input.to,
    updatedAt: now,
  };
}

export async function putPersistedCommunicationDraft(
  record: PersistedCommunicationDraft,
): Promise<CommunicationDraftStorageResult<void>> {
  try {
    await putDraftStorageRecord(record);
    return { status: "available", value: undefined };
  } catch (error) {
    return { status: "unavailable", reason: draftStorageUnavailableReason(error) };
  }
}

export async function savePersistedCommunicationDraft(
  input: SavePersistedCommunicationDraftInput,
): Promise<CommunicationDraftStorageResult<void>> {
  const record = persistedCommunicationDraftFromInput(input);
  if (!record) return clearPersistedCommunicationDrafts(input.scope);
  return putPersistedCommunicationDraft(record);
}

export async function clearPersistedCommunicationDrafts(
  scope: CommunicationDraftPersistenceScope | undefined,
): Promise<CommunicationDraftStorageResult<void>> {
  if (!scope) {
    return { status: "unavailable", reason: "indexeddb-unavailable" };
  }
  try {
    await deleteDraftStorageRecord(draftId(scope));
    return { status: "available", value: undefined };
  } catch (error) {
    return { status: "unavailable", reason: draftStorageUnavailableReason(error) };
  }
}

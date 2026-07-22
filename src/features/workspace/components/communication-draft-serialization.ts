import type { TicketCommunicationDraft } from "./metadata-draft";
import {
  forwardDraftEdited,
  replyRecipientsEdited,
} from "./communication-draft";
import type {
  PersistedDraftAiSuggestion,
  SavePersistedCommunicationDraftInput,
} from "./ticket-communication-draft-persistence";
import type {
  CommunicationDraftPersistenceScope,
} from "./ticket-communication-draft-runtime";

export function draftPersistenceInput(input: {
  draft: TicketCommunicationDraft;
  scope: CommunicationDraftPersistenceScope;
  suggestions: PersistedDraftAiSuggestion[];
}): SavePersistedCommunicationDraftInput {
  const { draft, scope, suggestions } = input;
  return {
    articleId: draft.kind === "internal-comment"
      ? undefined
      : draft.sourceArticleExternalId,
    attachmentExternalIds: draft.kind === "customer-forward"
      ? draft.attachmentExternalIds
      : undefined,
    bodyHtml: draft.body,
    cc: draft.kind === "internal-comment" ? undefined : draft.cc,
    conversationHistoryContextVersion: draft.kind === "internal-comment"
      ? undefined
      : draft.conversationHistoryContextVersion,
    conversationHistoryScope: draft.kind === "internal-comment"
      ? undefined
      : draft.conversationHistoryScope,
    contextVersion: draft.kind === "internal-comment"
      ? undefined
      : draft.contextVersion,
    includeConversationHistory: draft.kind === "internal-comment"
      ? undefined
      : draft.includeConversationHistory,
    intent: draft.kind === "customer-reply" ? draft.intent : undefined,
    kind: draft.kind,
    recipientEdited: draft.kind === "customer-reply"
      ? replyRecipientsEdited(draft)
      : draft.kind === "customer-forward" && forwardDraftEdited(draft),
    scope,
    signatureContext: draft.kind === "internal-comment"
      ? undefined
      : draft.signatureContext,
    subject: draft.kind === "customer-forward" ? draft.subject : undefined,
    suggestions,
    to: draft.kind === "internal-comment" ? undefined : draft.to,
  };
}

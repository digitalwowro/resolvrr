import type {
  TicketReplyIntent,
} from "@/core/ticket-replies";
import type {
  TicketConversationHistoryContext,
} from "@/core/ticket-conversation-history";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type {
  TicketCustomerForwardDraft,
  TicketCustomerReplyDraft,
} from "./metadata-draft-types";

export function replyDraftFromArticle(
  article: WorkspaceArticle,
  intent: TicketReplyIntent,
  conversationHistory?: TicketConversationHistoryContext,
): TicketCustomerReplyDraft | undefined {
  const context = article.replyContext;
  if (!context?.availableIntents.includes(intent)) {
    return undefined;
  }
  const defaults = intent === "reply-all"
    ? context.defaults.replyAll
    : context.defaults.reply;
  if (!defaults) return undefined;
  const to = defaults.to.map((recipient) => recipient.email);
  const cc = defaults.cc.map((recipient) => recipient.email);
  return {
    body: "",
    cc,
    conversationHistoryContextVersion: conversationHistory?.contextVersion,
    conversationHistoryMessageCount: conversationHistory?.messageCount,
    conversationHistoryScope: conversationHistory?.scope,
    contextVersion: context.contextVersion,
    defaultCc: [...cc],
    defaultIncludeConversationHistory: Boolean(conversationHistory),
    defaultTo: [...to],
    includeConversationHistory: Boolean(conversationHistory),
    intent,
    kind: "customer-reply",
    sourceArticleExternalId: context.sourceArticleExternalId,
    to,
  };
}

export function latestReplyableArticle(
  articles: WorkspaceArticle[],
): WorkspaceArticle | undefined {
  return articles.find((article) =>
    article.replyContext?.availableIntents.includes("reply"),
  );
}

export function forwardDraftFromArticle(
  article: WorkspaceArticle,
  conversationHistory?: TicketConversationHistoryContext,
): TicketCustomerForwardDraft | undefined {
  const context = article.forwardContext;
  if (!context) return undefined;
  const attachmentExternalIds = article.attachments.map((attachment) => attachment.id);
  return {
    attachmentExternalIds,
    body: "",
    cc: [],
    conversationHistoryContextVersion: conversationHistory?.contextVersion,
    conversationHistoryMessageCount: conversationHistory?.messageCount,
    conversationHistoryScope: conversationHistory?.scope,
    contextVersion: context.contextVersion,
    defaultAttachmentExternalIds: [...attachmentExternalIds],
    defaultCc: [],
    defaultIncludeConversationHistory: Boolean(conversationHistory),
    defaultSubject: context.subject,
    defaultTo: [],
    includeConversationHistory: Boolean(conversationHistory),
    kind: "customer-forward",
    sourceArticleExternalId: context.sourceArticleExternalId,
    subject: context.subject,
    to: [],
  };
}

export function latestForwardableArticle(
  articles: WorkspaceArticle[],
): WorkspaceArticle | undefined {
  return articles.find((article) => Boolean(article.forwardContext));
}

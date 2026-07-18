import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type {
  TicketConversationHistoryContext,
} from "@/core/ticket-conversation-history";
import type { TicketCommunicationDraft } from "./metadata-draft";
import type { PersistedCommunicationDraft } from "./ticket-communication-draft-persistence";

export function restoredCommunicationDraft(
  record: PersistedCommunicationDraft,
  articles: WorkspaceArticle[],
  capabilities: TicketCommunicationCapabilities,
  conversationHistory?: TicketConversationHistoryContext,
): TicketCommunicationDraft | undefined {
  const kind = record.kind ?? (record.mode === "comment"
    ? "internal-comment"
    : record.mode === "reply" ? "customer-reply" : undefined);
  if (kind === "internal-comment") {
    return capabilities.internalNotes ? { body: record.bodyHtml, kind } : undefined;
  }
  const sourceId = record.sourceArticleExternalId ?? record.articleId;
  const article = articles.find((item) => item.id === sourceId);
  if (kind === "customer-forward") {
    const context = article?.forwardContext;
    if (
      !capabilities.customerForwards || !article || !context ||
      record.contextVersion !== context.contextVersion
    ) return undefined;
    const availableAttachmentIds = new Set(article.attachments.map((item) => item.id));
    const defaultAttachments = article.attachments.map((item) => item.id);
    const history = record.conversationHistoryScope === "through-source"
      ? context.conversationHistory
      : conversationHistory;
    return {
      attachmentExternalIds: (record.attachmentExternalIds ?? defaultAttachments)
        .filter((id) => availableAttachmentIds.has(id)),
      body: record.bodyHtml,
      cc: record.cc ?? [],
      conversationHistoryContextVersion: history?.contextVersion,
      conversationHistoryMessageCount: history?.messageCount,
      conversationHistoryScope: history?.scope,
      contextVersion: context.contextVersion,
      defaultAttachmentExternalIds: defaultAttachments,
      defaultCc: [],
      defaultIncludeConversationHistory: Boolean(history),
      defaultSubject: context.subject,
      defaultTo: [],
      includeConversationHistory: Boolean(history) &&
        (record.includeConversationHistory ?? record.includeOriginal ?? true),
      kind,
      sourceArticleExternalId: context.sourceArticleExternalId,
      signatureContext: record.signatureContext,
      subject: record.subject ?? context.subject,
      to: record.to ?? [],
    };
  }
  const context = article?.replyContext;
  const intent = record.intent ?? "reply";
  if (
    kind !== "customer-reply" || !capabilities.customerReplies || !context ||
    !context.availableIntents.includes(intent) ||
    (record.contextVersion && record.contextVersion !== context.contextVersion)
  ) return undefined;
  const defaults = intent === "reply-all" ? context.defaults.replyAll : context.defaults.reply;
  if (!defaults) return undefined;
  const defaultTo = defaults.to.map((recipient) => recipient.email);
  const defaultCc = defaults.cc.map((recipient) => recipient.email);
  const history = record.conversationHistoryScope === "through-source"
    ? context.conversationHistory
    : conversationHistory;
  return {
    body: record.bodyHtml,
    cc: record.contextVersion ? record.cc ?? defaultCc : defaultCc,
    conversationHistoryContextVersion: history?.contextVersion,
    conversationHistoryMessageCount: history?.messageCount,
    conversationHistoryScope: history?.scope,
    contextVersion: context.contextVersion,
    defaultCc,
    defaultIncludeConversationHistory: Boolean(history),
    defaultTo,
    includeConversationHistory: Boolean(history) &&
      (record.includeConversationHistory ?? true),
    intent,
    kind,
    sourceArticleExternalId: context.sourceArticleExternalId,
    signatureContext: record.signatureContext,
    to: record.contextVersion ? record.to ?? defaultTo : defaultTo,
  };
}

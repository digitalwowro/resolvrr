import type { TicketCommunicationCapabilities } from "@/features/tickets/communication-model";
import type { WorkspaceArticle } from "@/features/tickets/workspace-adapter";
import type { TicketCommunicationDraft } from "./metadata-draft";
import type { PersistedCommunicationDraft } from "./ticket-communication-draft-persistence";

export function restoredCommunicationDraft(
  record: PersistedCommunicationDraft,
  articles: WorkspaceArticle[],
  capabilities: TicketCommunicationCapabilities,
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
    return {
      attachmentExternalIds: (record.attachmentExternalIds ?? defaultAttachments)
        .filter((id) => availableAttachmentIds.has(id)),
      body: record.bodyHtml,
      cc: record.cc ?? [],
      contextVersion: context.contextVersion,
      defaultAttachmentExternalIds: defaultAttachments,
      defaultCc: [],
      defaultIncludeOriginal: true,
      defaultSubject: context.subject,
      defaultTo: [],
      includeOriginal: record.includeOriginal ?? true,
      kind,
      sourceArticleExternalId: context.sourceArticleExternalId,
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

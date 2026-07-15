import type { ZammadArticle } from "./schemas";

export type ZammadArticleAttachment = ZammadArticle["attachments"][number];

export type ZammadArticleAttachmentClassification = {
  alternatives: ZammadArticleAttachment[];
  inline: ZammadArticleAttachment[];
  visible: ZammadArticleAttachment[];
};

const imageSourcePattern = /<img\b[^>]*\bsrc\s*=\s*(["'])(.*?)\1[^>]*>/giu;

export function zammadAttachmentContentId(
  attachment: ZammadArticleAttachment,
): string | undefined {
  const preferences = attachment.preferences;
  const value =
    preferences?.["Content-ID"] ??
    preferences?.["content-id"] ??
    preferences?.content_id;
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().replace(/^<|>$/gu, "");
  return normalized || undefined;
}

export function zammadAttachmentContentType(
  attachment: ZammadArticleAttachment,
): string | undefined {
  const value =
    attachment.preferences?.["Content-Type"] ??
    attachment.preferences?.["Mime-Type"];
  return typeof value === "string" ? value : undefined;
}

function isContentAlternative(attachment: ZammadArticleAttachment): boolean {
  return attachment.preferences?.["content-alternative"] === true;
}

function articleImageSources(body: string): string[] {
  return [...body.matchAll(imageSourcePattern)]
    .map((match) => match[2]?.trim())
    .filter((value): value is string => Boolean(value));
}

function cidAttachmentId(
  article: ZammadArticle,
  source: string,
): number | undefined {
  if (!source.toLowerCase().startsWith("cid:")) return undefined;
  const sourceContentId = source.slice(4).replace(/^<|>$/gu, "");
  return article.attachments.find(
    (attachment) => zammadAttachmentContentId(attachment) === sourceContentId,
  )?.id;
}

function inlineUrlAttachmentId(
  article: ZammadArticle,
  source: string,
): number | undefined {
  if (!source.startsWith("/")) return undefined;

  let url: URL;
  try {
    url = new URL(source, "https://zammad.invalid");
  } catch {
    return undefined;
  }

  const prefix = `/api/v1/ticket_attachment/${article.ticket_id}/${article.id}/`;
  if (!url.pathname.startsWith(prefix)) return undefined;
  if (
    url.searchParams.get("view") !== "inline" &&
    url.searchParams.get("disposition") !== "inline"
  ) {
    return undefined;
  }

  const externalId = url.pathname.slice(prefix.length);
  if (!/^\d+$/u.test(externalId)) return undefined;
  const attachmentId = Number(externalId);
  return article.attachments.some((attachment) => attachment.id === attachmentId)
    ? attachmentId
    : undefined;
}

export function zammadInlineAttachmentIdForSource(
  article: ZammadArticle,
  source: string,
): number | undefined {
  return cidAttachmentId(article, source) ?? inlineUrlAttachmentId(article, source);
}

function inlineAttachmentIds(article: ZammadArticle): Set<number> {
  const ids = articleImageSources(article.body ?? "").flatMap((source) => {
    const id = zammadInlineAttachmentIdForSource(article, source);
    return id === undefined ? [] : [id];
  });
  return new Set(ids);
}

export function classifyZammadArticleAttachments(
  article: ZammadArticle,
): ZammadArticleAttachmentClassification {
  const inlineIds = inlineAttachmentIds(article);
  const classification: ZammadArticleAttachmentClassification = {
    alternatives: [],
    inline: [],
    visible: [],
  };

  for (const attachment of article.attachments) {
    if (isContentAlternative(attachment)) {
      classification.alternatives.push(attachment);
    } else if (inlineIds.has(attachment.id)) {
      classification.inline.push(attachment);
    } else {
      classification.visible.push(attachment);
    }
  }

  return classification;
}

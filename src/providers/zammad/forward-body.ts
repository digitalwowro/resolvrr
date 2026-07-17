import { sanitizeForwardedProviderHtml } from "@/security/sanitize-html";
import { zammadInlineAttachmentIdForSource } from "./article-attachments";
import type { ZammadArticle } from "./schemas";
import type { ResolvedTicketSignature } from "@/core/ticket-signatures";
import { zammadOutboundSignatureHtml } from "./outbound-signature";

function escapeHtml(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;");
}

function addressValue(value: string | string[] | null | undefined): string {
  return Array.isArray(value) ? value.join(", ") : value ?? "";
}

function inlineArticleImages(
  html: string,
  article: ZammadArticle,
  images: Map<string, string>,
): string {
  return html.replace(
    /(<img\b[^>]*\bsrc\s*=\s*(["']))(.*?)(\2[^>]*>)/giu,
    (tag, prefix: string, _quote: string, source: string, suffix: string) => {
      const attachmentId = zammadInlineAttachmentIdForSource(article, source);
      const dataUrl = attachmentId === undefined
        ? undefined
        : images.get(String(attachmentId));
      return dataUrl ? `${prefix}${dataUrl}${suffix}` : tag;
    },
  );
}

export function zammadForwardBody(input: {
  article: ZammadArticle;
  body: string;
  bodyFormat: "plain" | "html";
  includeOriginal: boolean;
  inlineImages: Map<string, string>;
  signature?: ResolvedTicketSignature;
  subject: string;
}): { body: string; contentType: "text/html" } {
  const introduction = input.bodyFormat === "html"
    ? input.body
    : `<p>${escapeHtml(input.body).replace(/\n/gu, "<br>")}</p>`;
  const signature = zammadOutboundSignatureHtml(input.signature);
  if (!input.includeOriginal) {
    return { body: `${introduction}${signature}`, contentType: "text/html" };
  }
  const article = input.article;
  const original = sanitizeForwardedProviderHtml(
    inlineArticleImages(article.body ?? "", article, input.inlineImages),
  );
  const headers = [
    ["Subject", article.subject?.trim() || input.subject],
    ["Date", article.created_at ?? ""],
    ["From", article.from ?? ""],
    ["To", addressValue(article.to)],
    ["Cc", addressValue(article.cc)],
  ].filter(([, value]) => Boolean(value));
  const headerHtml = headers.map(([label, value]) =>
    `<div><strong>${label}:</strong> ${escapeHtml(value)}</div>`,
  ).join("");
  return {
    body: `${introduction}${signature}<br><div>---------- Forwarded message ----------</div>${headerHtml}<br>${original}`,
    contentType: "text/html",
  };
}

import { sanitizeForwardedProviderHtml } from "@/security/sanitize-html";
import type { ZammadArticle } from "./schemas";

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

function inlineCidImages(
  html: string,
  images: Map<string, string>,
): string {
  return html.replace(/cid:([^\s"'<>]+)/giu, (match, rawId: string) => {
    const id = rawId.replace(/^<|>$/gu, "").toLowerCase();
    return images.get(id) ?? match;
  });
}

export function zammadForwardBody(input: {
  article: ZammadArticle;
  body: string;
  bodyFormat: "plain" | "html";
  includeOriginal: boolean;
  inlineImages: Map<string, string>;
  subject: string;
}): { body: string; contentType: "text/html" } {
  const introduction = input.bodyFormat === "html"
    ? input.body
    : `<p>${escapeHtml(input.body).replace(/\n/gu, "<br>")}</p>`;
  if (!input.includeOriginal) {
    return { body: introduction, contentType: "text/html" };
  }
  const article = input.article;
  const original = sanitizeForwardedProviderHtml(
    inlineCidImages(article.body ?? "", input.inlineImages),
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
    body: `${introduction}<br><div>---------- Forwarded message ----------</div>${headerHtml}<br>${original}`,
    contentType: "text/html",
  };
}

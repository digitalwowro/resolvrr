import type { TicketArticleSignatureHint } from "@/core/ticket-article-signatures";
import {
  sanitizeProviderHtml,
  type ProviderHtmlSanitizationOptions,
} from "@/security/sanitize-html";
import {
  finalizeZammadSignatureHints,
  prepareZammadSignatureHints,
} from "./article-signature-hints";
import type { ZammadArticle } from "./schemas";

type ZammadArticleBodyOptions = ProviderHtmlSanitizationOptions & {
  signatureDetectionLine?: number;
};

export type NormalizedZammadSignatureBody = {
  html: string;
  signatureHints: TicketArticleSignatureHint[];
};

export type SanitizedZammadArticleBody = {
  sanitizedHtml: string;
  signatureHints: TicketArticleSignatureHint[];
};

function isValidSignatureDetectionLine(value: unknown): value is number {
  return typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value) &&
    value > 0;
}

function normalizedSignatureBody(
  html: string,
  signatureDetectionLine?: number,
): NormalizedZammadSignatureBody {
  const prepared = prepareZammadSignatureHints(
    html,
    isValidSignatureDetectionLine(signatureDetectionLine)
      ? signatureDetectionLine
      : undefined,
  );
  return finalizeZammadSignatureHints(prepared.html, prepared.protocol);
}

export function zammadArticleSignatureDetectionLine(
  article: ZammadArticle,
): number | undefined {
  const preferences = article.preferences;
  if (!preferences || typeof preferences !== "object") return undefined;
  const value = (preferences as Record<string, unknown>).signature_detection;
  return isValidSignatureDetectionLine(value) ? value : undefined;
}

export function normalizeZammadSignatureBodyResult(
  html: string,
  signatureDetectionLine?: number,
): NormalizedZammadSignatureBody {
  return normalizedSignatureBody(html, signatureDetectionLine);
}

export function sanitizeZammadArticleBodyResult(
  html: string,
  options: ZammadArticleBodyOptions = {},
): SanitizedZammadArticleBody {
  const { signatureDetectionLine, ...sanitizationOptions } = options;
  const prepared = prepareZammadSignatureHints(
    html,
    isValidSignatureDetectionLine(signatureDetectionLine)
      ? signatureDetectionLine
      : undefined,
  );
  const finalized = finalizeZammadSignatureHints(
    sanitizeProviderHtml(prepared.html, sanitizationOptions),
    prepared.protocol,
  );
  return {
    sanitizedHtml: finalized.html,
    signatureHints: finalized.signatureHints,
  };
}

export function sanitizeZammadArticleBody(
  html: string,
  options: ZammadArticleBodyOptions = {},
): string {
  return sanitizeZammadArticleBodyResult(html, options).sanitizedHtml;
}

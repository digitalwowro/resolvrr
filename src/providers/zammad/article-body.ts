import {
  sanitizeProviderHtml,
  type ProviderHtmlSanitizationOptions,
} from "@/security/sanitize-html";
import type { ZammadArticle } from "./schemas";

const zammadSignatureMarkerPattern =
  /<span\b[^>]*class=(['"])[^'"]*\bjs-signatureMarker\b[^'"]*\1[^>]*>\s*<\/span>/giu;
const zammadSignatureContainerPattern = /<(?:div|section)\b[^>]*>/giu;
const classAttributePattern = /\sclass=(['"])([^'"]*)\1/giu;
const temporarySignatureMarker =
  '<span class="js-signatureMarker"></span>';

const neutralSignatureBoundary =
  '<span data-resolvrr-signature-boundary="explicit"></span>';

type ZammadArticleBodyOptions = ProviderHtmlSanitizationOptions & {
  signatureDetectionLine?: number;
};

function isZammadSignatureContainer(tag: string) {
  return /\bclass\s*=\s*(['"])[^'"]*\bjs-signatureMarker\b[^'"]*\1/iu
      .test(tag) ||
    /\bdata-signature\s*=\s*(['"])true\1/iu.test(tag);
}

function prepareZammadSignatureBoundaries(
  html: string,
  signatureDetectionLine?: number,
) {
  const hasStandaloneMarker = zammadSignatureMarkerPattern.test(html);
  zammadSignatureMarkerPattern.lastIndex = 0;
  let prepared = hasStandaloneMarker
    ? html
    : html.replace(zammadSignatureContainerPattern, (tag) =>
        isZammadSignatureContainer(tag)
          ? `${temporarySignatureMarker}${tag}`
          : tag
      );
  if (
    Number.isInteger(signatureDetectionLine) &&
    Number(signatureDetectionLine) > 0 &&
    !zammadSignatureMarkerPattern.test(prepared)
  ) {
    const parts = prepared.split(/<br\s*\/?>/iu);
    const insertionIndex = Math.min(Number(signatureDetectionLine), parts.length);
    parts.splice(insertionIndex, 0, temporarySignatureMarker);
    prepared = parts.join("<br>");
  }
  zammadSignatureMarkerPattern.lastIndex = 0;
  return prepared;
}

function removeZammadMarkerClasses(html: string) {
  return html.replace(classAttributePattern, (_attribute, quote, value) => {
    const classes = String(value)
      .split(/\s+/u)
      .filter((className) => className && className !== "js-signatureMarker");
    return classes.length ? ` class=${quote}${classes.join(" ")}${quote}` : "";
  });
}

function finalizeZammadSignatureBoundaries(html: string) {
  const normalized = html.replace(
    zammadSignatureMarkerPattern,
    neutralSignatureBoundary,
  );
  zammadSignatureMarkerPattern.lastIndex = 0;
  return removeZammadMarkerClasses(normalized);
}

export function zammadArticleSignatureDetectionLine(
  article: ZammadArticle,
): number | undefined {
  const preferences = article.preferences;
  if (!preferences || typeof preferences !== "object") return undefined;
  const value = (preferences as Record<string, unknown>).signature_detection;
  const line = Number(value);
  return Number.isInteger(line) && line > 0 ? line : undefined;
}

export function normalizeZammadSignatureBoundaries(
  html: string,
  signatureDetectionLine?: number,
): string {
  return finalizeZammadSignatureBoundaries(
    prepareZammadSignatureBoundaries(html, signatureDetectionLine),
  );
}

export function sanitizeZammadArticleBody(
  html: string,
  options: ZammadArticleBodyOptions = {},
): string {
  const { signatureDetectionLine, ...sanitizationOptions } = options;
  const prepared = prepareZammadSignatureBoundaries(
    html,
    signatureDetectionLine,
  );
  return finalizeZammadSignatureBoundaries(
    sanitizeProviderHtml(prepared, sanitizationOptions),
  );
}

import {
  sanitizeProviderHtml,
  type ProviderHtmlSanitizationOptions,
} from "@/security/sanitize-html";

const zammadSignatureMarkerPattern =
  /<span\b[^>]*class=(['"])[^'"]*\bjs-signatureMarker\b[^'"]*\1[^>]*>\s*<\/span>/giu;

const neutralSignatureBoundary =
  '<span data-resolvrr-signature-boundary="explicit"></span>';

export function sanitizeZammadArticleBody(
  html: string,
  options?: ProviderHtmlSanitizationOptions,
): string {
  return sanitizeProviderHtml(html, options).replace(
    zammadSignatureMarkerPattern,
    neutralSignatureBoundary,
  );
}

import {
  trimArticleBodyHtml,
  type ArticleBodyTrimResult,
} from "@/features/workspace/components/ticket-article-body-trim";

export const providerSignatureBoundary =
  "<!-- provider-signature-boundary -->";

export function trimWithProviderSignatureBoundary(
  sourceHtml: string,
): ArticleBodyTrimResult {
  const firstBoundary = sourceHtml.indexOf(providerSignatureBoundary);
  const lastBoundary = sourceHtml.lastIndexOf(providerSignatureBoundary);
  if (firstBoundary < 0 || firstBoundary !== lastBoundary) {
    throw new Error("Expected exactly one provider signature boundary.");
  }

  const withoutBoundary = sourceHtml.replace(providerSignatureBoundary, "");
  const leadingWhitespace =
    withoutBoundary.length - withoutBoundary.trimStart().length;
  const html = withoutBoundary.trim();
  const boundaryOffset = firstBoundary - leadingWhitespace;
  if (boundaryOffset <= 0 || boundaryOffset >= html.length) {
    throw new Error("Provider signature boundary is outside the article body.");
  }

  return trimArticleBodyHtml(html, {
    signatureHints: [{
      boundaryOffset,
      kind: "provider-marker",
    }],
  });
}

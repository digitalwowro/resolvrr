import { normalizeLine, plainTextFromHtml } from "./ticket-article-content-html";
import { isSubstantiveHtml } from "./ticket-article-content-signature-dom";
import {
  containsQuotedReply,
  findQuotedReplyCandidate,
} from "./ticket-article-content-quote";
import { findSignatureCandidate } from "./ticket-article-content-signature";
import type {
  ArticleBodyHiddenKind,
  CollapseCandidate,
  HtmlLine,
  TicketArticleContentOptions,
} from "./ticket-article-content-types";

export function findArticleBodyCollapseCandidate(
  html: string,
  lines: HtmlLine[],
  options: TicketArticleContentOptions = {},
): CollapseCandidate | undefined {
  const quoteCandidate = findQuotedReplyCandidate(html, lines);
  const signatureCandidate = findSignatureCandidate(
    html,
    lines,
    quoteCandidate?.htmlStart ?? html.length,
    options.signatureHints,
  );

  return signatureCandidate ?? quoteCandidate ?? undefined;
}

export function refineHiddenKind(
  hiddenKind: ArticleBodyHiddenKind,
  hiddenHtml: string,
): ArticleBodyHiddenKind {
  if (hiddenKind !== "signature") return hiddenKind;
  return containsQuotedReply(hiddenHtml, plainTextFromHtml(hiddenHtml))
    ? "trimmed-content"
    : hiddenKind;
}

export function canCollapse(
  visibleHtml: string,
  hiddenHtml: string,
  hiddenKind: ArticleBodyHiddenKind,
) {
  const hiddenText = plainTextFromHtml(hiddenHtml);
  const hiddenLines = hiddenText
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean);
  const hasHiddenMedia = /<(?:img|svg|table)\b/iu.test(hiddenHtml);

  return (
    isSafeCollapseBoundary(visibleHtml, hiddenKind) &&
    (
      hiddenText.trim().length >= 120 ||
      hiddenLines.length >= 3 ||
      hasHiddenMedia
    )
  );
}

export function isSafeCollapseBoundary(
  visibleHtml: string,
  hiddenKind: ArticleBodyHiddenKind,
) {
  return hiddenKind === "quoted-reply"
    ? normalizeLine(plainTextFromHtml(visibleHtml)) !== ""
    : isSubstantiveHtml(visibleHtml);
}

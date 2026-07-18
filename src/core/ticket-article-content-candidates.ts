import { normalizeLine, plainTextFromHtml } from "./ticket-article-content-html";
import {
  containsQuotedReply,
  findQuotedReplyCandidate,
} from "./ticket-article-content-quote";
import { findSignatureCandidate } from "./ticket-article-content-signature";
import type {
  ArticleBodyHiddenKind,
  CollapseCandidate,
  HtmlLine,
} from "./ticket-article-content-types";

export function findArticleBodyCollapseCandidate(
  html: string,
  lines: HtmlLine[],
): CollapseCandidate | undefined {
  const quoteCandidate = findQuotedReplyCandidate(html, lines);
  const signatureCandidate = findSignatureCandidate(
    html,
    lines,
    quoteCandidate?.htmlStart ?? html.length,
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

export function canCollapse(visibleHtml: string, hiddenHtml: string) {
  const visibleText = plainTextFromHtml(visibleHtml);
  const hiddenText = plainTextFromHtml(hiddenHtml);
  const hiddenLines = hiddenText
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  return (
    normalizeLine(visibleText) !== "" &&
    (hiddenText.trim().length >= 120 || hiddenLines.length >= 3)
  );
}

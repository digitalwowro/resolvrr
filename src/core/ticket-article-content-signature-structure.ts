import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-content-html";
import {
  findStructuralSignatureCluster,
} from "./ticket-article-content-signature-cluster";
import {
  hasStructuralSeparation,
  leavesSubstantiveMessage,
  structuralBlockRanges,
  type SignatureStructuralBlock,
} from "./ticket-article-content-signature-dom";
import { findNestedSignatureEnvelope } from
  "./ticket-article-content-signature-envelope";
import type { CollapseCandidate } from "./ticket-article-content-types";

type HtmlBlockRange = SignatureStructuralBlock;

type StructuralSignatureRange = HtmlBlockRange & {
  strength: number;
};

const semanticSignatureTags = new Set(["address", "footer"]);
const anchorPattern =
  /<a\b[^>]*href=(['"])([^'"]+)\1[^>]*>([\s\S]*?)<\/a>/giu;
const emphasisPattern = /<(?:b|strong)\b/iu;
const imagePattern = /<img\b/giu;
const linkedImagePattern = /<img\b/iu;
const emailTextPattern =
  /\b[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+\b/iu;
const phoneTextPattern = /(?:^|\D)\+?\d[\d\s().-]{6,}\d(?:\D|$)/u;
const displayedAddressPattern =
  /^(?:https?:\/\/|www\.)?[^\s/]+\.[^\s/]+(?:\/\S*)?$/iu;
const compoundFooterForbiddenPattern =
  /<(?:a|address|article|blockquote|code|div|footer|h[1-6]|img|li|ol|pre|section|table|ul)\b/iu;
const singleParagraphPattern = /^\s*<p\b[^>]*>[\s\S]*<\/p>\s*$/iu;
const paragraphPattern = /<p\b/giu;
const htmlTagPattern = /<[a-z][^>]*>/iu;

export function findStructuralSignatureCandidate(
  html: string,
  advisoryBoundaryStart?: number,
): CollapseCandidate | null {
  const blocks = structuralBlockRanges(html);
  const envelope = findNestedSignatureEnvelope(
    html,
    blocks,
    advisoryBoundaryStart,
  );
  const cluster = findStructuralSignatureCluster(html, blocks);
  const candidates = blocks
    .map((range) => ({
      ...range,
      strength: signatureStrength(html, range),
    }))
    .filter((range): range is StructuralSignatureRange => range.strength > 0)
    .filter((range) => leavesSubstantiveMessage(html, range.start))
    .filter(
      (range) =>
        isTerminalRange(html, range) ||
        isContactBlockBeforeBoundary(html, range, advisoryBoundaryStart) ||
        isContactBlockWithTrailingFooter(html, range),
    )
    .sort(compareStructuralCandidates);
  const candidate = candidates[0];

  return envelope ?? cluster ?? (candidate
    ? {
        confidence: "structural",
        hiddenKind: "signature",
        htmlStart: candidate.start,
      }
    : null);
}

function compareStructuralCandidates(
  left: StructuralSignatureRange,
  right: StructuralSignatureRange,
) {
  return (
    right.strength - left.strength ||
    right.depth - left.depth ||
    right.start - left.start
  );
}

function isContactBlockWithTrailingFooter(
  html: string,
  range: HtmlBlockRange,
) {
  if (range.tagName !== "div" && range.tagName !== "section") return false;
  const blockHtml = html.slice(range.start, range.end);
  if (!/<img\b/iu.test(blockHtml)) return false;
  if (!hasStructuralSeparation(html.slice(0, range.start), range.tagName)) {
    return false;
  }

  const trailingHtml = html.slice(range.end);
  const trailingText = plainTextFromHtml(trailingHtml).trim();
  const trailingLines = trailingText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  const isSingleParagraph =
    (trailingHtml.match(paragraphPattern) ?? []).length === 1 &&
    singleParagraphPattern.test(trailingHtml);
  return (
    trailingText.length >= 120 &&
    trailingText.length <= 1_000 &&
    trailingLines.length <= 8 &&
    (isSingleParagraph || !htmlTagPattern.test(trailingHtml)) &&
    !compoundFooterForbiddenPattern.test(trailingHtml)
  );
}

function isContactBlockBeforeBoundary(
  html: string,
  range: HtmlBlockRange,
  advisoryBoundaryStart?: number,
) {
  if (range.tagName !== "div" && range.tagName !== "section") return false;
  if (
    advisoryBoundaryStart === undefined ||
    advisoryBoundaryStart <= range.end ||
    advisoryBoundaryStart - range.end > 200
  ) {
    return false;
  }
  const interveningText = plainTextFromHtml(
    html.slice(range.end, advisoryBoundaryStart),
  ).trim();
  return (
    interveningText.length <= 80 &&
    hasStructuralSeparation(html.slice(0, range.start), range.tagName)
  );
}

function isTerminalRange(html: string, range: HtmlBlockRange) {
  if (
    range.start <= 0 ||
    plainTextFromHtml(html.slice(0, range.start)).trim() === ""
  ) {
    return false;
  }
  if (plainTextFromHtml(html.slice(range.end)).trim() !== "") return false;
  return hasStructuralSeparation(html.slice(0, range.start), range.tagName);
}

function signatureStrength(html: string, range: HtmlBlockRange) {
  const blockHtml = html.slice(range.start, range.end);
  const blockText = plainTextFromHtml(blockHtml).trim();
  const lines = blockText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  if (lines.length < 2 || lines.length > 12 || blockText.length > 800) {
    return 0;
  }

  if (semanticSignatureTags.has(range.tagName)) return 4;
  const contactLinkCount = countContactLinks(blockHtml);
  const hasEmphasis = emphasisPattern.test(blockHtml);
  if (range.tagName === "table") {
    const rowCount = (blockHtml.match(/<tr\b/giu) ?? []).length;
    const cellCount = (blockHtml.match(/<t[dh]\b/giu) ?? []).length;
    return (
        contactLinkCount >= 1 &&
        hasEmphasis &&
        rowCount <= 2 &&
        cellCount <= 4
      ) ||
      isRichMediaContactTable(blockHtml, blockText, contactLinkCount)
      ? 3
      : 0;
  }
  return hasEmphasis &&
      phoneTextPattern.test(blockText) &&
      emailTextPattern.test(blockText)
    ? 2
    : contactLinkCount >= 2
      ? 1
      : 0;
}

function isRichMediaContactTable(
  html: string,
  text: string,
  contactLinkCount: number,
) {
  const imageCount = (html.match(imagePattern) ?? []).length;
  if (imageCount < 4 || contactLinkCount < 1 || !phoneTextPattern.test(text)) {
    return false;
  }

  let linkedImageCount = 0;
  for (const match of html.matchAll(anchorPattern)) {
    if (linkedImagePattern.test(match[3] ?? "")) linkedImageCount += 1;
  }
  return linkedImageCount >= 3;
}

function countContactLinks(html: string) {
  let count = 0;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[2] ?? "";
    const label = normalizeLine(plainTextFromHtml(match[3] ?? ""));
    if (
      href.toLowerCase().startsWith("mailto:") ||
      (href.toLowerCase().startsWith("http") &&
        displayedAddressPattern.test(label))
    ) {
      count += 1;
    }
  }
  return count;
}

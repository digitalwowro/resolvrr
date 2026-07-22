import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-content-html";
import {
  findStructuralSignatureCluster,
  type SignatureStructuralBlock,
} from "./ticket-article-content-signature-cluster";
import { findNestedSignatureEnvelope } from
  "./ticket-article-content-signature-envelope";
import type { CollapseCandidate } from "./ticket-article-content-types";

type HtmlBlockRange = SignatureStructuralBlock;

type StructuralSignatureRange = HtmlBlockRange & {
  strength: number;
};

const structuralTags = new Set(["address", "div", "footer", "section", "table"]);
const semanticSignatureTags = new Set(["address", "footer"]);
const tagPattern = /<\/?\s*([a-z0-9-]+)(?:\s[^>]*)?>/giu;
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
  /<(?:a|address|article|blockquote|code|div|footer|h[1-6]|img|li|ol|p|pre|section|table|ul)\b/iu;

export function findStructuralSignatureCandidate(
  html: string,
  explicitMarkerStart?: number,
): CollapseCandidate | null {
  const blocks = structuralBlockRanges(html);
  const envelope = findNestedSignatureEnvelope(
    html,
    blocks,
    explicitMarkerStart,
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
        isContactBlockBeforeMarker(html, range, explicitMarkerStart) ||
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

function leavesSubstantiveMessage(html: string, candidateStart: number) {
  const visibleText = plainTextFromHtml(html.slice(0, candidateStart)).trim();
  const visibleLines = visibleText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  return visibleLines.length >= 2 || normalizeLine(visibleText).length >= 80;
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
  return (
    trailingText.length >= 120 &&
    trailingText.length <= 1_000 &&
    trailingLines.length <= 8 &&
    !compoundFooterForbiddenPattern.test(trailingHtml)
  );
}

function isContactBlockBeforeMarker(
  html: string,
  range: HtmlBlockRange,
  explicitMarkerStart?: number,
) {
  if (range.tagName !== "div" && range.tagName !== "section") return false;
  if (
    explicitMarkerStart === undefined ||
    explicitMarkerStart <= range.end ||
    explicitMarkerStart - range.end > 200
  ) {
    return false;
  }
  const interveningText = plainTextFromHtml(
    html.slice(range.end, explicitMarkerStart),
  ).trim();
  return (
    interveningText.length <= 80 &&
    hasStructuralSeparation(html.slice(0, range.start), range.tagName)
  );
}

function structuralBlockRanges(html: string): HtmlBlockRange[] {
  const stack: Array<{ depth: number; start: number; tagName: string }> = [];
  const ranges: HtmlBlockRange[] = [];

  for (const match of html.matchAll(tagPattern)) {
    const tagName = match[1]?.toLowerCase();
    if (!tagName || !structuralTags.has(tagName)) continue;

    if (!match[0].startsWith("</")) {
      stack.push({ depth: stack.length, start: match.index, tagName });
      continue;
    }

    const stackIndex = stack.findLastIndex((entry) => entry.tagName === tagName);
    if (stackIndex < 0) continue;
    const [opened] = stack.splice(stackIndex, 1);
    if (opened) ranges.push({ end: match.index + match[0].length, ...opened });
  }

  return ranges;
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

function hasStructuralSeparation(htmlBefore: string, tagName: string) {
  const tail = htmlBefore.slice(-180);
  return (
    /(?:<br\b[^>]*>\s*){2,}$/iu.test(tail) ||
    /<\/(?:div|p|section)>\s*$/iu.test(tail) ||
    (tagName === "table" &&
      /(?:<br\b[^>]*>|<(?:div|section)\b[^>]*>)\s*$/iu.test(tail))
  );
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

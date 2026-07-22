import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-content-html";
import type { CollapseCandidate } from "./ticket-article-content-types";

export type SignatureStructuralBlock = {
  depth: number;
  end: number;
  start: number;
  tagName: string;
};

const phoneTextPattern = /(?:^|\D)\+?\d[\d\s().|-]{6,}\d(?:\D|$)/u;
const mailLinkPattern = /<a\b[^>]*href=(['"])mailto:[^'"]+\1/iu;
const emphasisPattern = /<(?:b|strong)\b/iu;
const imagePattern = /<img\b/giu;
const anchorPattern = /<a\b/giu;
const forbiddenTailPattern =
  /<(?:article|blockquote|button|form|h[1-6]|input|li|ol|pre|select|textarea|th|ul)\b/iu;

export function findStructuralSignatureCluster(
  html: string,
  blocks: SignatureStructuralBlock[],
): CollapseCandidate | null {
  const candidates = blocks
    .filter((block) => isContactCardAnchor(html, block))
    .filter((block) => leavesSubstantiveMessage(html, block.start))
    .filter((block) => hasStructuralSeparation(html.slice(0, block.start)))
    .filter((block) => hasTerminalSignatureTail(html, blocks, block))
    .sort((left, right) => right.depth - left.depth || right.start - left.start);
  const candidate = candidates[0];

  return candidate
    ? {
        confidence: "structural",
        hiddenKind: "signature",
        htmlStart: candidate.start,
      }
    : null;
}

function isContactCardAnchor(html: string, block: SignatureStructuralBlock) {
  if (block.tagName !== "table") return false;
  const blockHtml = html.slice(block.start, block.end);
  const blockText = plainTextFromHtml(blockHtml).trim();
  const rowCount = count(blockHtml, /<tr\b/giu);
  const cellCount = count(blockHtml, /<t[dh]\b/giu);
  return (
    blockText.length >= 30 &&
    blockText.length <= 800 &&
    rowCount >= 1 &&
    rowCount <= 3 &&
    cellCount >= 2 &&
    cellCount <= 8 &&
    count(blockHtml, imagePattern) >= 2 &&
    count(blockHtml, anchorPattern) >= 2 &&
    emphasisPattern.test(blockHtml) &&
    mailLinkPattern.test(blockHtml) &&
    phoneTextPattern.test(blockText)
  );
}

function hasTerminalSignatureTail(
  html: string,
  blocks: SignatureStructuralBlock[],
  anchor: SignatureStructuralBlock,
) {
  const followers = blocks
    .filter(
      (block) =>
        block.tagName === "table" &&
        block.depth === anchor.depth &&
        block.start >= anchor.end,
    )
    .sort((left, right) => left.start - right.start);
  if (followers.length < 1 || followers.length > 3) return false;

  let cursor = anchor.end;
  for (const follower of followers) {
    if (!isEmptySeparator(html.slice(cursor, follower.start))) return false;
    if (!isAllowedSignatureTailTable(html.slice(follower.start, follower.end))) {
      return false;
    }
    cursor = follower.end;
  }
  return isEmptySeparator(html.slice(cursor));
}

function isAllowedSignatureTailTable(tableHtml: string) {
  if (forbiddenTailPattern.test(tableHtml)) return false;
  const text = plainTextFromHtml(tableHtml).trim();
  const rowCount = count(tableHtml, /<tr\b/giu);
  const cellCount = count(tableHtml, /<td\b/giu);
  const imageCount = count(tableHtml, imagePattern);
  const linkCount = count(tableHtml, anchorPattern);

  const imageOnlyBranding =
    normalizeLine(text).length <= 4 &&
    imageCount >= 1 &&
    imageCount <= 4 &&
    linkCount <= 4 &&
    rowCount <= 2 &&
    cellCount <= 4;
  const singleCellFooter =
    text.length >= 120 &&
    text.length <= 2_000 &&
    imageCount === 0 &&
    linkCount <= 2 &&
    rowCount === 1 &&
    cellCount === 1;
  return imageOnlyBranding || singleCellFooter;
}

function leavesSubstantiveMessage(html: string, candidateStart: number) {
  const visibleText = plainTextFromHtml(html.slice(0, candidateStart)).trim();
  const visibleLines = visibleText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  return visibleLines.length >= 2 || normalizeLine(visibleText).length >= 80;
}

function hasStructuralSeparation(htmlBefore: string) {
  const tail = htmlBefore.slice(-220);
  return (
    /(?:<br\b[^>]*>\s*){2,}$/iu.test(tail) ||
    /<\/(?:div|p|section)>\s*$/iu.test(tail)
  );
}

function isEmptySeparator(html: string) {
  return (
    html.length <= 800 &&
    plainTextFromHtml(html).trim() === "" &&
    !/<(?:a|address|article|blockquote|footer|img|section|table)\b/iu.test(html)
  );
}

function count(html: string, pattern: RegExp) {
  return (html.match(pattern) ?? []).length;
}

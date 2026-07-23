import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-content-html";
import {
  countMatches,
  hasStructuralSeparation,
  isEmptyStructuralSeparator,
  leavesSubstantiveMessage,
  type SignatureStructuralBlock,
} from "./ticket-article-content-signature-dom";
import type { CollapseCandidate } from "./ticket-article-content-types";

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
  const rowCount = countMatches(blockHtml, /<tr\b/giu);
  const cellCount = countMatches(blockHtml, /<t[dh]\b/giu);
  return (
    blockText.length >= 30 &&
    blockText.length <= 800 &&
    rowCount >= 1 &&
    rowCount <= 3 &&
    cellCount >= 2 &&
    cellCount <= 8 &&
    countMatches(blockHtml, imagePattern) >= 2 &&
    countMatches(blockHtml, anchorPattern) >= 2 &&
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
    if (!isEmptyStructuralSeparator(html.slice(cursor, follower.start), 800)) {
      return false;
    }
    if (!isAllowedSignatureTailTable(html.slice(follower.start, follower.end))) {
      return false;
    }
    cursor = follower.end;
  }
  return isEmptyStructuralSeparator(html.slice(cursor), 800);
}

function isAllowedSignatureTailTable(tableHtml: string) {
  if (forbiddenTailPattern.test(tableHtml)) return false;
  const text = plainTextFromHtml(tableHtml).trim();
  const rowCount = countMatches(tableHtml, /<tr\b/giu);
  const cellCount = countMatches(tableHtml, /<td\b/giu);
  const imageCount = countMatches(tableHtml, imagePattern);
  const linkCount = countMatches(tableHtml, anchorPattern);

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

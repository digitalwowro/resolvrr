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

type SignatureEnvelopeBlock = SignatureStructuralBlock;

const phoneTextPattern = /(?:^|\D)\+?\d[\d\s().|-]{6,}\d(?:\D|$)/u;
const anchorPattern =
  /<a\b[^>]*href=(['"])([^'"]+)\1[^>]*>([\s\S]*?)<\/a>/giu;
const displayedAddressPattern =
  /^(?:https?:\/\/|www\.)?[^\s/]+\.[^\s/]+(?:\/\S*)?$/iu;
const forbiddenEnvelopePattern =
  /<(?:article|blockquote|button|form|h[1-6]|input|ol|pre|select|textarea|th|ul)\b/iu;

export function findNestedSignatureEnvelope(
  html: string,
  blocks: SignatureEnvelopeBlock[],
  advisoryBoundaryStart?: number,
): CollapseCandidate | null {
  const boundary = advisoryBoundaryStart ?? html.length;
  if (
    advisoryBoundaryStart !== undefined &&
    !isEmptyStructuralSeparator(html.slice(boundary), 1_000)
  ) {
    return null;
  }

  const candidates = blocks
    .filter((block) => block.end <= boundary)
    .filter((block) => block.depth <= 1)
    .filter((block) => block.tagName === "div" || block.tagName === "section")
    .filter((block) => isDenseContactEnvelope(html.slice(block.start, block.end)))
    .filter((block) =>
      isEmptyStructuralSeparator(html.slice(block.end, boundary), 1_000)
    )
    .filter((block) => hasStructuralSeparation(html.slice(0, block.start)))
    .filter((block) => leavesSubstantiveMessage(html, block.start))
    .sort((left, right) => right.start - left.start);
  const candidate = candidates[0];

  return candidate
    ? {
        confidence: "structural",
        hiddenKind: "signature",
        htmlStart: candidate.start,
      }
    : null;
}

function isDenseContactEnvelope(html: string) {
  const text = plainTextFromHtml(html).trim();
  if (
    text.length < 50 ||
    text.length > 2_000 ||
    forbiddenEnvelopePattern.test(html) ||
    countMatches(html, /<table\b/giu) < 4 ||
    countMatches(html, /<img\b/giu) < 4 ||
    countMatches(html, /<a\b/giu) < 4 ||
    !phoneTextPattern.test(text)
  ) {
    return false;
  }

  let displayedContactLinks = 0;
  let linkedImages = 0;
  for (const match of html.matchAll(anchorPattern)) {
    const labelHtml = match[3] ?? "";
    const label = normalizeLine(plainTextFromHtml(labelHtml));
    if (displayedAddressPattern.test(label)) displayedContactLinks += 1;
    if (/<img\b/iu.test(labelHtml)) linkedImages += 1;
  }
  return displayedContactLinks >= 1 && linkedImages >= 3;
}

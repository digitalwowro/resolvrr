import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-content-html";
import type { CollapseCandidate } from "./ticket-article-content-types";

type SignatureEnvelopeBlock = {
  depth: number;
  end: number;
  start: number;
  tagName: string;
};

const phoneTextPattern = /(?:^|\D)\+?\d[\d\s().|-]{6,}\d(?:\D|$)/u;
const anchorPattern =
  /<a\b[^>]*href=(['"])([^'"]+)\1[^>]*>([\s\S]*?)<\/a>/giu;
const displayedAddressPattern =
  /^(?:https?:\/\/|www\.)?[^\s/]+\.[^\s/]+(?:\/\S*)?$/iu;
const markerPattern =
  /<span\b[^>]*data-resolvrr-signature-boundary=(['"])explicit\1[^>]*>\s*<\/span>/giu;
const forbiddenEnvelopePattern =
  /<(?:article|blockquote|button|form|h[1-6]|input|ol|pre|select|textarea|th|ul)\b/iu;

export function findNestedSignatureEnvelope(
  html: string,
  blocks: SignatureEnvelopeBlock[],
  markerStart?: number,
): CollapseCandidate | null {
  const boundary = markerStart ?? html.length;
  if (!hasEmptyBoundarySuffix(html, boundary, markerStart !== undefined)) {
    return null;
  }

  const candidates = blocks
    .filter((block) => block.end <= boundary)
    .filter((block) => block.depth <= 1)
    .filter((block) => block.tagName === "div" || block.tagName === "section")
    .filter((block) => isDenseContactEnvelope(html.slice(block.start, block.end)))
    .filter((block) => isEmptySeparator(html.slice(block.end, boundary)))
    .filter((block) => hasStructuralSeparation(html.slice(0, block.start)))
    .filter((block) => leavesAuthoredMessage(html, block.start))
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
    count(html, /<table\b/giu) < 4 ||
    count(html, /<img\b/giu) < 4 ||
    count(html, /<a\b/giu) < 4 ||
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

function leavesAuthoredMessage(html: string, candidateStart: number) {
  const text = normalizeLine(
    plainTextFromHtml(html.slice(0, candidateStart)).trim(),
  );
  const tokens = text.split(/\s+/u).filter(Boolean);
  return tokens.length >= 4 || text.length >= 40;
}

function hasEmptyBoundarySuffix(
  html: string,
  boundary: number,
  hasMarker: boolean,
) {
  if (!hasMarker) return true;
  const suffix = html.slice(boundary).replace(markerPattern, "");
  return isEmptySeparator(suffix);
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
    html.length <= 1_000 &&
    plainTextFromHtml(html).trim() === "" &&
    !/<(?:a|address|article|blockquote|footer|img|section|table)\b/iu.test(html)
  );
}

function count(html: string, pattern: RegExp) {
  return (html.match(pattern) ?? []).length;
}

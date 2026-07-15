import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-body-html";
import type {
  CollapseCandidate,
  HtmlLine,
} from "./ticket-article-body-trim-types";

type HtmlBlockRange = {
  end: number;
  start: number;
  tagName: string;
};

const neutralMarkerPattern =
  /<span\b[^>]*data-resolvrr-signature-boundary=(['"])explicit\1[^>]*>\s*<\/span>/iu;
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

export function findSignatureCandidate(
  html: string,
  lines: HtmlLine[],
  messageEnd: number,
): CollapseCandidate | null {
  const currentMessageHtml = html.slice(0, messageEnd);
  const explicit = findExplicitCandidate(currentMessageHtml);
  const delimiter = findDelimiterCandidate(lines, messageEnd);
  const structural = findStructuralCandidate(
    currentMessageHtml,
    explicit?.htmlStart,
  );

  return (
    [explicit, delimiter, structural]
      .filter((candidate): candidate is CollapseCandidate => Boolean(candidate))
      .sort((left, right) => left.htmlStart - right.htmlStart)[0] ?? null
  );
}

function findExplicitCandidate(html: string): CollapseCandidate | null {
  const match = neutralMarkerPattern.exec(html);
  return match && match.index > 0
    ? { confidence: "explicit", hiddenKind: "signature", htmlStart: match.index }
    : null;
}

function findDelimiterCandidate(
  lines: HtmlLine[],
  messageEnd: number,
): CollapseCandidate | null {
  const messageLines = lines.filter(
    (line) =>
      line.htmlStart < messageEnd && normalizeLine(line.text) !== "",
  );
  const searchStart = Math.max(1, Math.floor(messageLines.length * 0.25));
  const candidates = messageLines.slice(searchStart).filter(
    (line) => line.htmlStart > 0 && /^--\s*$/.test(normalizeLine(line.text)),
  );
  const candidate = candidates.at(-1);
  return candidate
    ? {
        confidence: "delimiter",
        hiddenKind: "signature",
        htmlStart: candidate.htmlStart,
      }
    : null;
}

function findStructuralCandidate(
  html: string,
  explicitMarkerStart?: number,
): CollapseCandidate | null {
  const ranges = structuralBlockRanges(html)
    .filter((range) => isStrongSignatureBlock(html, range))
    .filter(
      (range) =>
        isTerminalRange(html, range) ||
        isContactBlockBeforeMarker(html, range, explicitMarkerStart),
    )
    .sort((left, right) => left.start - right.start);
  const candidate = ranges[0];

  return candidate
    ? {
        confidence: "structural",
        hiddenKind: "signature",
        htmlStart: candidate.start,
      }
    : null;
}

function isContactBlockBeforeMarker(
  html: string,
  range: HtmlBlockRange,
  explicitMarkerStart?: number,
) {
  if (range.tagName !== "div" && range.tagName !== "section") {
    return false;
  }
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
  const stack: Array<{ start: number; tagName: string }> = [];
  const ranges: HtmlBlockRange[] = [];

  for (const match of html.matchAll(tagPattern)) {
    const tagName = match[1]?.toLowerCase();
    if (!tagName || !structuralTags.has(tagName)) continue;

    if (!match[0].startsWith("</")) {
      stack.push({ start: match.index, tagName });
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

function isStrongSignatureBlock(html: string, range: HtmlBlockRange) {
  const blockHtml = html.slice(range.start, range.end);
  const blockText = plainTextFromHtml(blockHtml).trim();
  const lines = blockText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  if (
    lines.length < 2 ||
    lines.length > 12 ||
    blockText.length > 800
  ) {
    return false;
  }

  if (semanticSignatureTags.has(range.tagName)) return true;
  const contactLinkCount = countContactLinks(blockHtml);
  const hasEmphasis = emphasisPattern.test(blockHtml);
  if (range.tagName === "table") {
    const rowCount = (blockHtml.match(/<tr\b/giu) ?? []).length;
    const cellCount = (blockHtml.match(/<t[dh]\b/giu) ?? []).length;
    return (
      (contactLinkCount >= 1 &&
        hasEmphasis &&
        rowCount <= 2 &&
        cellCount <= 4) ||
      isRichMediaContactTable(blockHtml, blockText, contactLinkCount)
    );
  }
  return (
    contactLinkCount >= 2 ||
    (hasEmphasis &&
      phoneTextPattern.test(blockText) &&
      emailTextPattern.test(blockText))
  );
}

function isRichMediaContactTable(
  html: string,
  text: string,
  contactLinkCount: number,
) {
  const imageCount = (html.match(imagePattern) ?? []).length;
  if (
    imageCount < 4 ||
    contactLinkCount < 1 ||
    !phoneTextPattern.test(text)
  ) {
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

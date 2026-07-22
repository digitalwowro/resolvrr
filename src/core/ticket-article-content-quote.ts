import { normalizeLine } from "./ticket-article-content-html";
import type {
  CollapseCandidate,
  HtmlLine,
} from "./ticket-article-content-types";

export const STRUCTURAL_QUOTE_PATTERNS = [
  /<blockquote\b/i,
  /<[^>]+class=(["'])[^"']*(?:gmail_quote|gmail_attr|moz-cite-prefix|yahoo_quoted)[^"']*\1/i,
  /<[^>]+id=(["'])divRplyFwdMsg\1/i,
  /<[^>]+type=(["'])cite\1/i,
];

export const QUOTE_HEADER_PATTERNS = [
  /^On .+\bwrote:?$/i,
  /^-{2,}\s*Original Message\s*-{2,}$/i,
  /^Begin forwarded message:?$/i,
];

const inlineQuotePattern = /^>+/u;

export function findQuotedReplyCandidate(
  html: string,
  lines: HtmlLine[],
): CollapseCandidate | null {
  const candidates = [
    findStructuralQuoteCandidate(html),
    findQuoteHeaderCandidate(lines),
  ].filter((candidate): candidate is CollapseCandidate => Boolean(candidate));

  return (
    candidates
      .filter((candidate) => candidate.htmlStart > 0)
      .sort((left, right) => left.htmlStart - right.htmlStart)[0] ?? null
  );
}

export function containsQuotedReply(html: string, text: string) {
  const lines = text
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  return (
    STRUCTURAL_QUOTE_PATTERNS.some((pattern) => pattern.test(html)) ||
    lines.some((line) =>
      QUOTE_HEADER_PATTERNS.some((pattern) => pattern.test(line)),
    ) ||
    lines.some((line, index) => isMailHeader(lines, line, index))
  );
}

function findStructuralQuoteCandidate(html: string): CollapseCandidate | null {
  const match = STRUCTURAL_QUOTE_PATTERNS.map((pattern) => pattern.exec(html))
    .filter((entry): entry is RegExpExecArray => Boolean(entry))
    .sort((left, right) => left.index - right.index)[0];

  return match
    ? { confidence: "structural", hiddenKind: "quoted-reply", htmlStart: match.index }
    : null;
}

function findQuoteHeaderCandidate(lines: HtmlLine[]): CollapseCandidate | null {
  const normalizedLines = lines.map((line) => normalizeLine(line.text));
  for (let index = 0; index < lines.length; index += 1) {
    const text = normalizedLines[index] ?? "";
    if (
      QUOTE_HEADER_PATTERNS.some((pattern) => pattern.test(text)) ||
      (inlineQuotePattern.test(text) &&
        isTerminalInlineQuote(normalizedLines, index)) ||
      isMailHeader(
        normalizedLines,
        text,
        index,
      )
    ) {
      return {
        confidence: "structural",
        hiddenKind: "quoted-reply",
        htmlStart: lines[index]?.htmlStart ?? 0,
      };
    }
  }
  return null;
}

function isTerminalInlineQuote(lines: string[], startIndex: number) {
  let foundQuote = false;
  for (const line of lines.slice(startIndex)) {
    if (!line) continue;
    if (!inlineQuotePattern.test(line)) return false;
    foundQuote = true;
  }
  return foundQuote;
}

function isMailHeader(lines: string[], line: string, index: number) {
  if (!/^From:/i.test(line)) return false;
  const nextLines = lines.slice(index + 1, index + 8);
  return (
    nextLines.some((nextLine) => /^(Sent|Date):/i.test(nextLine)) &&
    nextLines.some((nextLine) => /^(To|Subject):/i.test(nextLine))
  );
}

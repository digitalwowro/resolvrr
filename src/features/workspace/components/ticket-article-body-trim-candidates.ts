import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-body-html";
import type {
  ArticleBodyHiddenKind,
  CollapseCandidate,
  HtmlLine,
} from "./ticket-article-body-trim-types";

const STRUCTURAL_QUOTE_PATTERNS = [
  /<blockquote\b/i,
  /<[^>]+class=(["'])[^"']*(?:gmail_quote|gmail_attr|moz-cite-prefix|yahoo_quoted)[^"']*\1/i,
  /<[^>]+id=(["'])divRplyFwdMsg\1/i,
  /<[^>]+type=(["'])cite\1/i,
];

const QUOTE_HEADER_PATTERNS = [
  /^On .+\bwrote:?$/i,
  /^-{2,}\s*Original Message\s*-{2,}$/i,
  /^Begin forwarded message:?$/i,
  /^>+/,
];

const CONTACT_LINE_PATTERN =
  /\b(?:tel|telephone|phone|mobile|linkedin|facebook|website|web|email|e-mail|address)\b|https?:\/\/|www\.|@/i;

const FOOTER_LINE_PATTERN =
  /\b(?:confidential|unsubscribe|privacy policy|intended recipient|do not print|all rights reserved)\b/i;

export function findArticleBodyCollapseCandidate(
  html: string,
  lines: HtmlLine[],
): CollapseCandidate | undefined {
  return [
    findStructuralQuoteCandidate(html),
    findQuoteHeaderCandidate(lines),
    findSignatureMarkerCandidate(html),
    findSignatureCandidate(lines),
  ]
    .filter((candidate): candidate is CollapseCandidate => Boolean(candidate))
    .sort((left, right) => left.htmlStart - right.htmlStart)
    .find((entry) => entry.htmlStart > 0);
}

function findStructuralQuoteCandidate(html: string): CollapseCandidate | null {
  const match = STRUCTURAL_QUOTE_PATTERNS.map((pattern) => pattern.exec(html))
    .filter((entry): entry is RegExpExecArray => Boolean(entry))
    .sort((left, right) => left.index - right.index)[0];

  if (!match) {
    return null;
  }

  return {
    hiddenKind: "quoted-reply",
    htmlStart: match.index,
  } satisfies CollapseCandidate;
}

function findQuoteHeaderCandidate(lines: HtmlLine[]): CollapseCandidate | null {
  for (let index = 0; index < lines.length; index += 1) {
    const text = normalizeLine(lines[index]?.text ?? "");
    if (QUOTE_HEADER_PATTERNS.some((pattern) => pattern.test(text))) {
      return {
        hiddenKind: "quoted-reply",
        htmlStart: lines[index]?.htmlStart ?? 0,
      } satisfies CollapseCandidate;
    }

    if (
      /^From:/i.test(text) &&
      lines
        .slice(index + 1, index + 6)
        .some((line) => /^(Sent|Date):/i.test(normalizeLine(line.text))) &&
      lines
        .slice(index + 1, index + 8)
        .some((line) => /^(To|Subject):/i.test(normalizeLine(line.text)))
    ) {
      return {
        hiddenKind: "quoted-reply",
        htmlStart: lines[index]?.htmlStart ?? 0,
      } satisfies CollapseCandidate;
    }
  }

  return null;
}

function findSignatureMarkerCandidate(html: string): CollapseCandidate | null {
  const match =
    /<span\b[^>]*class=(["'])[^"']*\bjs-signatureMarker\b[^"']*\1[^>]*>\s*<\/span>/i.exec(
      html,
    );

  if (!match) {
    return null;
  }

  return {
    hiddenKind: "signature",
    htmlStart: match.index,
  };
}

function findSignatureCandidate(lines: HtmlLine[]): CollapseCandidate | null {
  const nonEmptyLines = lines.filter((line) => normalizeLine(line.text) !== "");
  const markerStartIndex = Math.max(1, Math.floor(nonEmptyLines.length * 0.25));
  const candidates: CollapseCandidate[] = [];

  for (let index = markerStartIndex; index < nonEmptyLines.length; index += 1) {
    if (/^--\s*$/.test(normalizeLine(nonEmptyLines[index]?.text ?? ""))) {
      candidates.push({
        hiddenKind: "signature",
        htmlStart: nonEmptyLines[index]?.htmlStart ?? 0,
      });
    }
  }

  const searchStart = Math.min(markerStartIndex, 2);
  for (let index = searchStart; index < nonEmptyLines.length; index += 1) {
    const window = nonEmptyLines.slice(index, index + 6);
    const contactLineIndexes = window
      .map((line, offset) =>
        CONTACT_LINE_PATTERN.test(normalizeLine(line.text)) ? offset : -1,
      )
      .filter((offset) => offset >= 0);
    const footerLineIndexes = window
      .map((line, offset) =>
        FOOTER_LINE_PATTERN.test(normalizeLine(line.text)) ? offset : -1,
      )
      .filter((offset) => offset >= 0);

    if (contactLineIndexes.length >= 2 || footerLineIndexes.length >= 2) {
      const firstMatchedLineIndex =
        index +
        Math.min(
          contactLineIndexes[0] ?? Number.POSITIVE_INFINITY,
          footerLineIndexes[0] ?? Number.POSITIVE_INFINITY,
        );

      candidates.push({
        hiddenKind: "signature",
        htmlStart: nonEmptyLines[firstMatchedLineIndex]?.htmlStart ?? 0,
      });
    }
  }

  return (
    candidates
      .filter((candidate) => candidate.htmlStart > 0)
      .sort((left, right) => left.htmlStart - right.htmlStart)[0] ?? null
  );
}

export function refineHiddenKind(
  hiddenKind: ArticleBodyHiddenKind,
  hiddenHtml: string,
): ArticleBodyHiddenKind {
  if (hiddenKind !== "signature") {
    return hiddenKind;
  }

  const hiddenText = plainTextFromHtml(hiddenHtml);
  if (containsQuotedReply(hiddenHtml, hiddenText)) {
    return "trimmed-content";
  }

  return hiddenKind;
}

function containsQuotedReply(html: string, text: string) {
  const lines = text
    .split("\n")
    .map((line) => normalizeLine(line))
    .filter(Boolean);

  return (
    STRUCTURAL_QUOTE_PATTERNS.some((pattern) => pattern.test(html)) ||
    lines.some((line) =>
      QUOTE_HEADER_PATTERNS.some((pattern) => pattern.test(line)),
    ) ||
    lines.some((line, index) => {
      if (!/^From:/i.test(line)) {
        return false;
      }

      const nextLines = lines.slice(index + 1, index + 8);
      return (
        nextLines.some((nextLine) => /^(Sent|Date):/i.test(nextLine)) &&
        nextLines.some((nextLine) => /^(To|Subject):/i.test(nextLine))
      );
    })
  );
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

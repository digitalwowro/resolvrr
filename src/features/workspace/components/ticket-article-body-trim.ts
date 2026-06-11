export type ArticleBodyHiddenKind =
  | "quoted-reply"
  | "signature"
  | "trimmed-content";

export type ArticleBodyTrimResult =
  | {
      collapsed: false;
      visibleHtml: string;
    }
  | {
      collapsed: true;
      hiddenHtml: string;
      hiddenKind: ArticleBodyHiddenKind;
      visibleHtml: string;
    };

type HtmlLine = {
  htmlStart: number;
  text: string;
};

type CollapseCandidate = {
  hiddenKind: ArticleBodyHiddenKind;
  htmlStart: number;
};

const BLOCK_START_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

const BLOCK_END_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "li",
  "main",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tbody",
  "td",
  "tfoot",
  "th",
  "thead",
  "tr",
  "ul",
]);

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

const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "source",
  "track",
  "wbr",
]);

const HTML_TAG_PATTERN = /<\/?\s*([a-z0-9-]+)(?:\s[^>]*)?>/giu;

export function trimArticleBodyHtml(html: string): ArticleBodyTrimResult {
  const normalizedHtml = normalizeHtmlForHydration(html).trim();
  if (normalizedHtml.length === 0) {
    return { collapsed: false, visibleHtml: normalizedHtml };
  }

  const lines = linesFromHtml(normalizedHtml);
  const candidates = [
    findStructuralQuoteCandidate(normalizedHtml),
    findQuoteHeaderCandidate(lines),
    findSignatureMarkerCandidate(normalizedHtml),
    findSignatureCandidate(lines),
  ].filter((candidate): candidate is CollapseCandidate => Boolean(candidate));

  const candidate = candidates
    .sort((left, right) => left.htmlStart - right.htmlStart)
    .find((entry) => entry.htmlStart > 0);

  if (!candidate) {
    return { collapsed: false, visibleHtml: normalizedHtml };
  }

  const visibleHtml = closeOpenTags(
    trimTrailingEmptyBlocks(normalizedHtml.slice(0, candidate.htmlStart)),
  );
  const hiddenHtml = normalizedHtml.slice(candidate.htmlStart).trim();

  if (!canCollapse(visibleHtml, hiddenHtml)) {
    return { collapsed: false, visibleHtml: normalizedHtml };
  }

  return {
    collapsed: true,
    hiddenHtml,
    hiddenKind: refineHiddenKind(candidate.hiddenKind, hiddenHtml),
    visibleHtml,
  };
}

function normalizeHtmlForHydration(html: string) {
  return html.replace(/<br\s*\/>/gi, "<br>").replace(/<hr\s*\/>/gi, "<hr>");
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

function refineHiddenKind(
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

function canCollapse(visibleHtml: string, hiddenHtml: string) {
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

function linesFromHtml(html: string) {
  const lines: HtmlLine[] = [];
  let lineStart: number | null = null;
  let lineText = "";
  let index = 0;

  function ensureLineStart(start: number) {
    lineStart ??= start;
  }

  function appendText(text: string, start: number) {
    ensureLineStart(start);
    lineText += text;
  }

  function flushLine() {
    if (lineStart !== null || lineText.trim() !== "") {
      lines.push({
        htmlStart: lineStart ?? 0,
        text: lineText,
      });
    }
    lineStart = null;
    lineText = "";
  }

  while (index < html.length) {
    const char = html[index];

    if (char === "<") {
      const tagEnd = html.indexOf(">", index + 1);
      if (tagEnd === -1) {
        appendText(html.slice(index), index);
        break;
      }

      const tagSource = html.slice(index, tagEnd + 1);
      const tagName = tagSource.match(/^<\/?\s*([a-z0-9-]+)/i)?.[1]?.toLowerCase();
      const isClosingTag = /^<\//.test(tagSource);

      if (tagName === "br" || tagName === "hr") {
        flushLine();
      } else if (tagName) {
        if (!isClosingTag && BLOCK_START_TAGS.has(tagName) && lineText === "") {
          ensureLineStart(index);
        }
        if (isClosingTag && BLOCK_END_TAGS.has(tagName)) {
          flushLine();
        } else if (!isClosingTag && lineStart === null) {
          ensureLineStart(index);
        }
      }

      index = tagEnd + 1;
      continue;
    }

    if (char === "&") {
      const entityEnd = html.indexOf(";", index + 1);
      if (entityEnd !== -1 && entityEnd - index <= 12) {
        appendText(decodeHtmlEntity(html.slice(index, entityEnd + 1)), index);
        index = entityEnd + 1;
        continue;
      }
    }

    appendText(char, index);
    index += 1;
  }

  flushLine();
  return lines;
}

function plainTextFromHtml(html: string) {
  return html
    .replace(/<(?:br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(?:p|div|blockquote|li|tr|td|th|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity) =>
      decodeHtmlEntity(entity),
    )
    .replace(/\u00a0/g, " ");
}

function trimTrailingEmptyBlocks(html: string) {
  let currentHtml = html.trim();

  while (true) {
    const nextHtml = currentHtml
      .replace(/(?:\s|<br\s*\/?>|&nbsp;)+$/i, "")
      .replace(
        /\s*<(p|div)[^>]*>(?:\s|&nbsp;|<br\s*\/?>)*<\/\1>\s*$/i,
        "",
      )
      .replace(
        /(<(p|div)[^>]*>[\s\S]*?)(?:\s|<br\s*\/?>|&nbsp;)+(<\/\2>)$/i,
        "$1$3",
      )
      .trim();

    if (nextHtml === currentHtml) {
      return currentHtml;
    }

    currentHtml = nextHtml;
  }
}

function closeOpenTags(html: string) {
  const openTags: string[] = [];

  for (const match of html.matchAll(HTML_TAG_PATTERN)) {
    const source = match[0];
    const tagName = match[1]?.toLowerCase();
    if (!tagName || VOID_TAGS.has(tagName) || /\/\s*>$/.test(source)) {
      continue;
    }

    if (source.startsWith("</")) {
      const matchingIndex = openTags.lastIndexOf(tagName);
      if (matchingIndex >= 0) {
        openTags.splice(matchingIndex);
      }
      continue;
    }

    openTags.push(tagName);
  }

  if (openTags.length === 0) {
    return html;
  }

  return `${html}${openTags
    .reverse()
    .map((tagName) => `</${tagName}>`)
    .join("")}`;
}

function decodeHtmlEntity(entity: string) {
  const lowerEntity = entity.toLowerCase();
  if (lowerEntity === "&nbsp;") return " ";
  if (lowerEntity === "&amp;") return "&";
  if (lowerEntity === "&lt;") return "<";
  if (lowerEntity === "&gt;") return ">";
  if (lowerEntity === "&quot;") return '"';
  if (lowerEntity === "&#39;" || lowerEntity === "&apos;") return "'";

  const decimalMatch = /^&#(\d+);$/.exec(lowerEntity);
  if (decimalMatch?.[1]) {
    return String.fromCodePoint(Number.parseInt(decimalMatch[1], 10));
  }

  const hexMatch = /^&#x([0-9a-f]+);$/.exec(lowerEntity);
  if (hexMatch?.[1]) {
    return String.fromCodePoint(Number.parseInt(hexMatch[1], 16));
  }

  return entity;
}

function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

import type { HtmlLine } from "./ticket-article-body-trim-types";

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

export function normalizeHtmlForHydration(html: string) {
  return html.replace(/<br\s*\/>/gi, "<br>").replace(/<hr\s*\/>/gi, "<hr>");
}

export function linesFromHtml(html: string) {
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

export function plainTextFromHtml(html: string) {
  return html
    .replace(/<(?:br|hr)\b[^>]*>/gi, "\n")
    .replace(/<\/(?:p|div|blockquote|li|tr|td|th|h[1-6]|section|article)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&(?:#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity) =>
      decodeHtmlEntity(entity),
    )
    .replace(/\u00a0/g, " ");
}

export function trimTrailingEmptyBlocks(html: string) {
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

export function closeOpenTags(html: string) {
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

export function normalizeLine(line: string) {
  return line.replace(/\s+/g, " ").trim();
}

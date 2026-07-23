import { parseDocument } from "htmlparser2";
import {
  isTag,
  type ChildNode,
} from "domhandler";
import {
  normalizeLine,
  plainTextFromHtml,
} from "./ticket-article-content-html";

export type SignatureStructuralBlock = {
  depth: number;
  end: number;
  start: number;
  tagName: string;
};

const structuralTags = new Set(["address", "div", "footer", "section", "table"]);

export function structuralBlockRanges(
  html: string,
): SignatureStructuralBlock[] {
  const document = parseDocument(html, {
    recognizeSelfClosing: true,
    withEndIndices: true,
    withStartIndices: true,
  });
  const ranges: SignatureStructuralBlock[] = [];

  function visit(nodes: ChildNode[], depth: number) {
    for (const node of nodes) {
      if (!isTag(node)) continue;
      const tagName = node.name.toLowerCase();
      const isStructural = structuralTags.has(tagName);
      if (
        isStructural &&
        node.startIndex !== null &&
        node.endIndex !== null
      ) {
        ranges.push({
          depth,
          end: node.endIndex + 1,
          start: node.startIndex,
          tagName,
        });
      }
      visit(node.children, isStructural ? depth + 1 : depth);
    }
  }

  visit(document.children, 0);
  return ranges;
}

export function leavesSubstantiveMessage(
  html: string,
  candidateStart: number,
) {
  return isSubstantiveHtml(html.slice(0, candidateStart));
}

export function isSubstantiveHtml(html: string) {
  const text = plainTextFromHtml(html).trim();
  const normalizedText = normalizeLine(text);
  const lines = text
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean);
  const tokens = normalizedText.split(/\s+/u).filter(Boolean);
  return (
    (lines.length >= 2 && normalizedText.length >= 20) ||
    tokens.length >= 8 ||
    normalizedText.length >= 80 ||
    (tokens.length >= 2 && /[.!?…]\s*$/u.test(text)) ||
    (tokens.length >= 3 && normalizedText.length >= 20)
  );
}

export function hasStructuralSeparation(
  htmlBefore: string,
  tagName?: string,
) {
  const tail = htmlBefore.slice(-220);
  return (
    /(?:<br\b[^>]*>\s*){2,}$/iu.test(tail) ||
    /<\/(?:div|p|section)>\s*$/iu.test(tail) ||
    (tagName === "table" &&
      /(?:<br\b[^>]*>|<(?:div|section)\b[^>]*>)\s*$/iu.test(tail))
  );
}

export function isEmptyStructuralSeparator(
  html: string,
  maxLength: number,
) {
  return (
    html.length <= maxLength &&
    plainTextFromHtml(html).trim() === "" &&
    !/<(?:a|address|article|blockquote|footer|img|section|table)\b/iu.test(html)
  );
}

export function countMatches(html: string, pattern: RegExp) {
  return (html.match(pattern) ?? []).length;
}

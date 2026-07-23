import type { TicketArticleSignatureHint } from
  "@/core/ticket-article-signatures";
import { normalizeHtmlForHydration } from
  "@/core/ticket-article-content-html";
import { isTag, type Element, type Node } from "domhandler";
import { parseDocument } from "htmlparser2";
import { randomUUID } from "node:crypto";

const legacyInternalHintClassPattern =
  /\bresolvrr-signature-hint-(?:marker|container-start|container-end|learned)-\d+\b/gu;
const classAttributePattern = /\sclass=(['"])([^'"]*)\1/giu;

type HintKind =
  | "marker"
  | "container-start"
  | "container-end"
  | "learned";

type HintProtocol = {
  classPrefix: string;
  markerPattern: RegExp;
};

export type PreparedZammadSignatureHints = {
  html: string;
  protocol: HintProtocol;
};

export type ZammadSignatureHintResult = {
  html: string;
  signatureHints: TicketArticleSignatureHint[];
};

type SourceElementRange = {
  end: number;
  start: number;
};

type SourceSignatureEvidence = {
  containers: SourceElementRange[];
  markers: SourceElementRange[];
};

type SourceEdit = SourceElementRange & {
  replacement: string;
};

function createHintProtocol(): HintProtocol {
  const classPrefix =
    `resolvrr-signature-hint-${randomUUID().replaceAll("-", "")}-`;
  return {
    classPrefix,
    markerPattern: new RegExp(
      `<span\\b[^>]*class=(['"])${classPrefix}` +
        "(marker|container-start|container-end|learned)-(\\d+)\\1" +
        "[^>]*>\\s*</span>",
      "giu",
    ),
  };
}

function classNames(element: Element): string[] {
  return (element.attribs.class ?? "").split(/\s+/u).filter(Boolean);
}

function isSignatureElement(element: Element): boolean {
  return classNames(element).includes("js-signatureMarker") ||
    element.attribs["data-signature"]?.toLowerCase() === "true";
}

function isEmptyMarker(element: Element): boolean {
  return element.children.every(
    (child) =>
      child.type === "text" && child.data.trim().length === 0,
  );
}

function elementRange(element: Element): SourceElementRange | undefined {
  if (element.startIndex === null || element.endIndex === null) return undefined;
  return { start: element.startIndex, end: element.endIndex + 1 };
}

function signatureEvidence(html: string): SourceSignatureEvidence {
  const document = parseDocument(html, {
    withEndIndices: true,
    withStartIndices: true,
  });
  const evidence: SourceSignatureEvidence = { containers: [], markers: [] };

  function visit(nodes: Node[], insideSignatureContainer = false) {
    for (const node of nodes) {
      if (!isTag(node)) continue;
      const element = node as Element;
      const signatureElement = isSignatureElement(element);
      const standaloneMarker =
        signatureElement && element.name === "span" && isEmptyMarker(element);
      const isContainer = signatureElement && !standaloneMarker;
      const range = elementRange(element);

      if (!insideSignatureContainer && isContainer && range) {
        evidence.containers.push(range);
        continue;
      }
      if (!insideSignatureContainer && standaloneMarker && range) {
        evidence.markers.push(range);
      }
      visit(element.children, insideSignatureContainer || isContainer);
    }
  }

  visit(document.children);
  return evidence;
}

function hintMarker(
  protocol: HintProtocol,
  kind: HintKind,
  index: number,
): string {
  return `<span class="${protocol.classPrefix}${kind}-${index}"></span>`;
}

function applySourceEdits(html: string, edits: SourceEdit[]): string {
  return [...edits]
    .sort((left, right) => right.start - left.start || right.end - left.end)
    .reduce(
      (current, edit) =>
        `${current.slice(0, edit.start)}${edit.replacement}${current.slice(edit.end)}`,
      html,
    );
}

function removeClasses(html: string, pattern: RegExp): string {
  return html.replace(classAttributePattern, (_attribute, quote, value) => {
    const classes = String(value)
      .split(/\s+/u)
      .filter((className) => {
        pattern.lastIndex = 0;
        return className && !pattern.test(className);
      });
    return classes.length ? ` class=${quote}${classes.join(" ")}${quote}` : "";
  });
}

export function prepareZammadSignatureHints(
  html: string,
  signatureDetectionLine?: number,
): PreparedZammadSignatureHints {
  const protocol = createHintProtocol();
  const evidence = signatureEvidence(html);
  const edits: SourceEdit[] = [];

  evidence.markers.forEach((range, index) => {
    edits.push({
      ...range,
      replacement: hintMarker(protocol, "marker", index),
    });
  });
  evidence.containers.forEach((range, index) => {
    edits.push(
      {
        start: range.end,
        end: range.end,
        replacement: hintMarker(protocol, "container-end", index),
      },
      {
        start: range.start,
        end: range.start,
        replacement: hintMarker(protocol, "container-start", index),
      },
    );
  });

  if (edits.length > 0 || signatureDetectionLine === undefined) {
    return { html: applySourceEdits(html, edits), protocol };
  }

  const parts = html.split(/<br\s*\/?>/iu);
  const insertionIndex = Math.min(signatureDetectionLine, parts.length);
  parts.splice(
    insertionIndex,
    0,
    hintMarker(protocol, "learned", signatureDetectionLine),
  );
  return { html: parts.join("<br>"), protocol };
}

export function finalizeZammadSignatureHints(
  html: string,
  protocol: HintProtocol,
): ZammadSignatureHintResult {
  const withoutProviderClasses = removeClasses(
    html,
    /\bjs-signatureMarker\b/gu,
  );
  const cleanHtml = normalizeHtmlForHydration(
    removeClasses(withoutProviderClasses, legacyInternalHintClassPattern),
  ).trim();
  const hints: TicketArticleSignatureHint[] = [];
  const containerStarts = new Map<string, number>();
  let cursor = 0;
  let output = "";

  protocol.markerPattern.lastIndex = 0;
  for (const match of cleanHtml.matchAll(protocol.markerPattern)) {
    const matchIndex = match.index;
    output += cleanHtml.slice(cursor, matchIndex);
    const [, , kind, id] = match;

    if (kind === "container-start") {
      containerStarts.set(id, output.length);
    } else if (kind === "container-end") {
      const startOffset = containerStarts.get(id);
      if (startOffset !== undefined) {
        hints.push({
          kind: "provider-container",
          startOffset,
          endOffset: output.length,
        });
        containerStarts.delete(id);
      }
    } else {
      const boundaryOffset = output.length;
      hints.push(
        kind === "learned"
          ? {
              kind: "provider-learned-line",
              boundaryOffset,
              line: Number(id),
            }
          : { kind: "provider-marker", boundaryOffset },
      );
    }
    cursor = matchIndex + match[0].length;
  }
  output += cleanHtml.slice(cursor);

  return {
    html: output,
    signatureHints: hints.sort((left, right) => {
      const leftOffset =
        "boundaryOffset" in left ? left.boundaryOffset : left.startOffset;
      const rightOffset =
        "boundaryOffset" in right ? right.boundaryOffset : right.startOffset;
      return leftOffset - rightOffset;
    }),
  };
}

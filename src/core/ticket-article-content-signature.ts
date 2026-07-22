import {
  normalizeLine,
} from "./ticket-article-content-html";
import { findStructuralSignatureCandidate } from
  "./ticket-article-content-signature-structure";
import type {
  CollapseCandidate,
  HtmlLine,
} from "./ticket-article-content-types";

const neutralMarkerPattern =
  /<span\b[^>]*data-resolvrr-signature-boundary=(['"])explicit\1[^>]*>\s*<\/span>/iu;

export function findSignatureCandidate(
  html: string,
  lines: HtmlLine[],
  messageEnd: number,
): CollapseCandidate | null {
  const currentMessageHtml = html.slice(0, messageEnd);
  const explicit = findExplicitCandidate(currentMessageHtml);
  const delimiter = findDelimiterCandidate(lines, messageEnd);
  const structural = findStructuralSignatureCandidate(
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

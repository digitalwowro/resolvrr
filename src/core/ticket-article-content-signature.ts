import {
  normalizeLine,
} from "./ticket-article-content-html";
import {
  isSubstantiveHtml,
  leavesSubstantiveMessage,
} from "./ticket-article-content-signature-dom";
import { findStructuralSignatureCandidate } from
  "./ticket-article-content-signature-structure";
import type { TicketArticleSignatureHint } from "./ticket-article-signatures";
import type {
  CollapseCandidate,
  HtmlLine,
} from "./ticket-article-content-types";

export function findSignatureCandidate(
  html: string,
  lines: HtmlLine[],
  messageEnd: number,
  signatureHints: readonly TicketArticleSignatureHint[] = [],
): CollapseCandidate | null {
  const currentMessageHtml = html.slice(0, messageEnd);
  const delimiter = findDelimiterCandidate(lines, messageEnd);
  const providerCandidates = providerHintCandidates(
    signatureHints,
    currentMessageHtml.length,
    html.length,
  );
  const structural = findStructuralSignatureCandidate(
    currentMessageHtml,
    providerCandidates
      .flatMap((provider) =>
        provider.adjacentStructureBoundary === undefined
          ? []
          : [provider.adjacentStructureBoundary]
      )
      .sort((left, right) => left - right)[0],
  );

  if (providerCandidates.length) {
    return resolveProviderCandidate(
      currentMessageHtml,
      providerCandidates,
      delimiter,
      structural,
    );
  }

  return delimiter ?? structural;
}

type ProviderCandidate = {
  adjacentStructureBoundary?: number;
  candidate: CollapseCandidate;
  containerEnd?: number;
  kind: TicketArticleSignatureHint["kind"];
};

function providerHintCandidates(
  hints: readonly TicketArticleSignatureHint[],
  messageEnd: number,
  articleEnd: number,
): ProviderCandidate[] {
  return hints
    .flatMap((hint): ProviderCandidate[] => {
      const start = hint.kind === "provider-container"
        ? hint.startOffset
        : hint.boundaryOffset;
      if (
        !Number.isInteger(start) ||
        start <= 0 ||
        start >= articleEnd ||
        start > messageEnd ||
        (hint.kind === "provider-container" && start === messageEnd)
      ) {
        return [];
      }
      if (
        hint.kind === "provider-container" &&
        (!Number.isInteger(hint.endOffset) ||
          hint.endOffset <= start ||
          hint.endOffset > articleEnd)
      ) {
        return [];
      }
      return [{
        ...(hint.kind === "provider-marker"
          ? { adjacentStructureBoundary: start }
          : {}),
        candidate: {
          confidence: "explicit",
          hiddenKind: "signature",
          htmlStart: start,
        },
        ...(hint.kind === "provider-container"
          ? { containerEnd: Math.min(hint.endOffset, messageEnd) }
          : {}),
        kind: hint.kind,
      }];
    })
    .sort(
      (left, right) =>
        right.candidate.htmlStart - left.candidate.htmlStart,
    );
}

function resolveProviderCandidate(
  html: string,
  providers: ProviderCandidate[],
  delimiter: CollapseCandidate | null,
  structural: CollapseCandidate | null,
): CollapseCandidate | null {
  for (const provider of providers) {
    const leavesMessage = leavesSubstantiveMessage(
      html,
      provider.candidate.htmlStart,
    );
    if (provider.kind === "provider-marker" && leavesMessage) {
      const earlierStructure =
        structural &&
          structural.htmlStart < provider.candidate.htmlStart &&
          leavesSubstantiveMessage(html, structural.htmlStart)
          ? structural
          : null;
      if (earlierStructure) return earlierStructure;
      return provider.candidate;
    }
    const refined = saferInnerCandidate(
      html,
      provider,
      delimiter,
      structural,
    );
    if (refined) return refined;
  }

  return firstSafeCandidate(html, delimiter, structural);
}

function saferInnerCandidate(
  html: string,
  provider: ProviderCandidate,
  delimiter: CollapseCandidate | null,
  structural: CollapseCandidate | null,
) {
  const candidates = [delimiter, structural]
    .filter((candidate): candidate is CollapseCandidate => Boolean(candidate))
    .filter((candidate) => candidate.htmlStart >= provider.candidate.htmlStart)
    .filter(
      (candidate) =>
        provider.containerEnd === undefined ||
        candidate.htmlStart < provider.containerEnd,
    )
    .filter((candidate) => {
      if (candidate.htmlStart === provider.candidate.htmlStart) {
        return candidate.confidence === "structural";
      }
      return isSubstantiveHtml(
        html.slice(provider.candidate.htmlStart, candidate.htmlStart),
      );
    })
    .filter((candidate) => leavesSubstantiveMessage(html, candidate.htmlStart))
    .sort((left, right) => {
      const confidenceDifference =
        candidateStrength(right) - candidateStrength(left);
      return confidenceDifference || right.htmlStart - left.htmlStart;
    });
  return candidates[0] ?? null;
}

function firstSafeCandidate(
  html: string,
  ...candidates: Array<CollapseCandidate | null>
) {
  return (
    candidates
      .filter((candidate): candidate is CollapseCandidate => Boolean(candidate))
      .filter((candidate) =>
        leavesSubstantiveMessage(html, candidate.htmlStart)
      )
      .sort((left, right) => {
        const confidenceDifference =
          candidateStrength(right) - candidateStrength(left);
        return confidenceDifference || right.htmlStart - left.htmlStart;
      })[0] ?? null
  );
}

function candidateStrength(candidate: CollapseCandidate) {
  if (candidate.confidence === "explicit") return 3;
  if (candidate.confidence === "delimiter") return 2;
  return 1;
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

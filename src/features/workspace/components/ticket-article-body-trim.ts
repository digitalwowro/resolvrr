import {
  closeOpenTags,
  linesFromHtml,
  normalizeHtmlForHydration,
  trimTrailingEmptyBlocks,
} from "./ticket-article-body-html";
import {
  canCollapse,
  findArticleBodyCollapseCandidate,
  refineHiddenKind,
} from "./ticket-article-body-trim-candidates";
import type { ArticleBodyTrimResult } from "./ticket-article-body-trim-types";

export type {
  ArticleBodyHiddenKind,
  ArticleBodyTrimResult,
} from "./ticket-article-body-trim-types";

export function trimArticleBodyHtml(html: string): ArticleBodyTrimResult {
  const normalizedHtml = normalizeHtmlForHydration(html).trim();
  if (normalizedHtml.length === 0) {
    return { collapsed: false, visibleHtml: normalizedHtml };
  }

  const candidate = findArticleBodyCollapseCandidate(
    normalizedHtml,
    linesFromHtml(normalizedHtml),
  );

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

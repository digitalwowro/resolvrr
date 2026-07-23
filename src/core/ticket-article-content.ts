import {
  closeOpenTags,
  linesFromHtml,
  normalizeHtmlForHydration,
  trimTrailingEmptyBlocks,
} from "./ticket-article-content-html";
import {
  canCollapse,
  findArticleBodyCollapseCandidate,
  isSafeCollapseBoundary,
  refineHiddenKind,
} from "./ticket-article-content-candidates";
import type {
  ArticleBodyTrimResult,
  TicketArticleContentOptions,
} from "./ticket-article-content-types";

export type {
  ArticleBodyHiddenKind,
  ArticleBodyTrimResult,
  TicketArticleContentOptions,
} from "./ticket-article-content-types";

export function trimArticleBodyHtml(
  html: string,
  options: TicketArticleContentOptions = {},
): ArticleBodyTrimResult {
  const split = splitArticleBodyHtml(html, options);
  if (!split) {
    return {
      collapsed: false,
      visibleHtml: normalizeHtmlForHydration(html).trim(),
    };
  }
  if (!canCollapse(split.visibleHtml, split.hiddenHtml, split.hiddenKind)) {
    return { collapsed: false, visibleHtml: split.normalizedHtml };
  }

  return {
    collapsed: true,
    hiddenHtml: split.hiddenHtml,
    hiddenKind: refineHiddenKind(split.hiddenKind, split.hiddenHtml),
    visibleHtml: split.visibleHtml,
  };
}

function splitArticleBodyHtml(
  html: string,
  options: TicketArticleContentOptions,
) {
  const normalizedHtml = normalizeHtmlForHydration(html).trim();
  if (normalizedHtml.length === 0) {
    return undefined;
  }

  const candidate = findArticleBodyCollapseCandidate(
    normalizedHtml,
    linesFromHtml(normalizedHtml),
    options,
  );

  if (!candidate) {
    return undefined;
  }

  const visibleHtml = closeOpenTags(
    trimTrailingEmptyBlocks(normalizedHtml.slice(0, candidate.htmlStart)),
  );
  const hiddenHtml = normalizedHtml.slice(candidate.htmlStart).trim();
  if (!isSafeCollapseBoundary(visibleHtml, candidate.hiddenKind)) {
    return undefined;
  }

  return {
    hiddenHtml,
    hiddenKind: candidate.hiddenKind,
    normalizedHtml,
    visibleHtml,
  };
}

export function visibleTicketArticleMessageHtml(
  html: string,
  options: TicketArticleContentOptions = {},
): string {
  const split = splitArticleBodyHtml(html, options);
  return split?.visibleHtml ?? normalizeHtmlForHydration(html).trim();
}

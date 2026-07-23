export type TicketArticleProviderMarkerSignatureHint = {
  kind: "provider-marker";
  boundaryOffset: number;
};

export type TicketArticleProviderContainerSignatureHint = {
  kind: "provider-container";
  startOffset: number;
  endOffset: number;
};

export type TicketArticleProviderLearnedLineSignatureHint = {
  kind: "provider-learned-line";
  boundaryOffset: number;
  line: number;
};

/**
 * Provider-neutral evidence about where a ticket article signature may begin.
 *
 * Offsets use JavaScript string indices into the article's final
 * `sanitizedHtml`. A container range is half-open: `[startOffset, endOffset)`.
 * Hints are evidence rather than an instruction to hide content; consumers
 * must validate them and fail open when they are implausible.
 */
export type TicketArticleSignatureHint =
  | TicketArticleProviderMarkerSignatureHint
  | TicketArticleProviderContainerSignatureHint
  | TicketArticleProviderLearnedLineSignatureHint;

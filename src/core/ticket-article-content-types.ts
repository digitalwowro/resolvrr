import type { TicketArticleSignatureHint } from "./ticket-article-signatures";

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

export type HtmlLine = {
  htmlStart: number;
  text: string;
};

export type CollapseCandidate = {
  confidence: "delimiter" | "explicit" | "structural";
  hiddenKind: ArticleBodyHiddenKind;
  htmlStart: number;
};

export type TicketArticleContentOptions = {
  signatureHints?: readonly TicketArticleSignatureHint[];
};

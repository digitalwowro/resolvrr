export type DraftRewriteOperation = "proofread" | "rephrase";
export type DraftRephraseMode = "concise" | "formal" | "simple" | "warmer";
export type DraftComposerMode = "comment" | "reply";

export type DraftRewriteRequest = {
  bodyHtml: string;
  composerMode: DraftComposerMode;
  operation: DraftRewriteOperation;
  rephraseMode?: DraftRephraseMode;
};

export type DraftRewriteUnavailableReason =
  | "empty-draft"
  | "provider-auth-failed"
  | "provider-rate-limited"
  | "provider-temporary-failure";

export type DraftRewriteResult =
  | {
      generatedAt: string;
      operation: DraftRewriteOperation;
      rephraseMode?: DraftRephraseMode;
      status: "available";
      text: string;
    }
  | {
      reason:
        | "ai-disabled"
        | "invalid-ai-config"
        | "missing-user-ai-config"
        | "missing-workspace-ai-config"
        | "no-active-workspace";
      retryable: false;
      status: "unconfigured";
    }
  | {
      reason: DraftRewriteUnavailableReason;
      retryable: boolean;
      status: "unavailable";
    };

export type RewriteDraftAction = (
  request: DraftRewriteRequest,
) => Promise<DraftRewriteResult>;

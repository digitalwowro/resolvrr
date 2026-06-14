export type DraftRewriteOperation = "proofread" | "rephrase";
export type DraftComposerMode = "comment" | "reply";

export type DraftRewriteRequest = {
  bodyHtml: string;
  composerMode: DraftComposerMode;
  operation: DraftRewriteOperation;
  rephraseStyleId?: string;
};

export type DraftRewriteUnavailableReason =
  | "empty-draft"
  | "invalid-rephrase-style"
  | "provider-auth-failed"
  | "provider-rate-limited"
  | "provider-temporary-failure";

export type DraftRewriteResult =
  | {
      generatedAt: string;
      operation: DraftRewriteOperation;
      rephraseStyle?: {
        id: string;
        label: string;
      };
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

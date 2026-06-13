export type TicketAiSummaryRequest = {
  forceRefresh?: boolean;
  ticketExternalId: string;
};

export type TicketAiSummaryUnavailableReason =
  | "empty-ticket"
  | "provider-auth-failed"
  | "provider-rate-limited"
  | "provider-temporary-failure"
  | "ticket-unavailable";

export type TicketAiSummaryResult =
  | {
      status: "available";
      generatedAt: string;
      source: {
        articleCount: number;
        ticketNumber: string;
        ticketUpdatedAt: string;
      };
      summary: string;
    }
  | {
      status: "unconfigured";
      reason:
        | "ai-disabled"
        | "invalid-ai-config"
        | "missing-user-ai-config"
        | "missing-workspace-ai-config"
        | "no-active-workspace";
      retryable: false;
    }
  | {
      status: "unavailable";
      reason: TicketAiSummaryUnavailableReason;
      retryable: boolean;
    };

export type SummarizeWorkspaceTicketAction = (
  request: TicketAiSummaryRequest,
) => Promise<TicketAiSummaryResult>;

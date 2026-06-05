export type TicketAiSummaryRequest = {
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
        | "missing-anthropic-compatible-config"
        | "missing-openai-compatible-config";
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

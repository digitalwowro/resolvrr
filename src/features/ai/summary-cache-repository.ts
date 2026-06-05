import type { TicketAiSummaryResult } from "./model";

export type AiSummaryCacheKey = {
  helpdeskConnectionId: string;
  modelFingerprint: string;
  operation: "ticket-summary";
  promptVersion: string;
  providerProtocol: "anthropic-compatible" | "openai-compatible";
  sanitizationVersion: string;
  sourceFingerprint: string;
  ticketExternalId: string;
  userId: string;
};

export type AiSummaryCacheReadInput = AiSummaryCacheKey & {
  encryptionKey: string;
  now?: Date;
};

export type AiSummaryCacheWriteInput = AiSummaryCacheReadInput & {
  result: Extract<TicketAiSummaryResult, { status: "available" }>;
};

export type AiSummaryCacheInvalidateInput = {
  helpdeskConnectionId: string;
  ticketExternalId: string;
  userId: string;
};

export type AiSummaryCacheConnectionInvalidateInput = {
  helpdeskConnectionId: string;
  userId: string;
};

export type AiSummaryCacheRepository = {
  enabled: boolean;
  findFreshSummary(
    input: AiSummaryCacheReadInput,
  ): Promise<Extract<TicketAiSummaryResult, { status: "available" }> | null>;
  storeSummary(input: AiSummaryCacheWriteInput): Promise<void>;
  invalidateTicket(input: AiSummaryCacheInvalidateInput): Promise<void>;
  invalidateConnection(input: AiSummaryCacheConnectionInvalidateInput): Promise<void>;
};

export const noAiSummaryCacheRepository: AiSummaryCacheRepository = {
  enabled: false,
  async findFreshSummary() {
    return null;
  },
  async storeSummary() {},
  async invalidateTicket() {},
  async invalidateConnection() {},
};

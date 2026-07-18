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

export type AiSummaryCacheReadResult =
  | {
      ageBucket: string;
      result: Extract<TicketAiSummaryResult, { status: "available" }>;
      status: "hit";
    }
  | {
      ageBucket?: string;
      status: "miss";
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

export type AiSummaryCacheWorkspaceInvalidateInput = {
  workspaceId: string;
};

export type AiSummaryCacheRepository = {
  enabled: boolean;
  readSummary(input: AiSummaryCacheReadInput): Promise<AiSummaryCacheReadResult>;
  storeSummary(input: AiSummaryCacheWriteInput): Promise<void>;
  invalidateTicket(input: AiSummaryCacheInvalidateInput): Promise<void>;
  invalidateConnection(input: AiSummaryCacheConnectionInvalidateInput): Promise<void>;
  invalidateWorkspace(input: AiSummaryCacheWorkspaceInvalidateInput): Promise<void>;
};

export const noAiSummaryCacheRepository: AiSummaryCacheRepository = {
  enabled: false,
  async readSummary() {
    return { status: "miss" };
  },
  async storeSummary() {},
  async invalidateTicket() {},
  async invalidateConnection() {},
  async invalidateWorkspace() {},
};

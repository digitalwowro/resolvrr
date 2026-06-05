import type { TicketDetail } from "@/core/tickets";
import { ticketSummaryPromptContext } from "./ticket-summary-context";
import type { TicketAiSummaryResult } from "./model";
import type { AiRuntimeConfig } from "./provider-config";
import { generateAiText } from "./text-generation";
import { aiSummaryCacheKey } from "./summary-cache-key";
import {
  noAiSummaryCacheRepository,
  type AiSummaryCacheKey,
  type AiSummaryCacheRepository,
} from "./summary-cache-repository";
import {
  aiGenerationTimingDuration,
  aiGenerationTimingStart,
  recordAiGenerationTiming,
} from "@/telemetry/ai-generation-timing";

const summarySystemInstruction = [
  "You summarize helpdesk tickets for internal support agents.",
  "Use only the provided ticket data.",
  "Do not invent facts, next actions, identifiers, or customer commitments.",
  "Do not write a customer reply.",
  "Return plain text under 140 words with three short sections: Situation, Timeline, Next Risk.",
].join(" ");

type TicketSummaryCacheOptions = {
  cacheRepository?: AiSummaryCacheRepository;
  encryptionKey: string;
  scope: {
    helpdeskConnectionId: string;
    ticketExternalId: string;
    userId: string;
  };
};

async function readCachedSummary(input: {
  cacheKey: AiSummaryCacheKey;
  cacheRepository: AiSummaryCacheRepository;
  encryptionKey: string;
}): Promise<Extract<TicketAiSummaryResult, { status: "available" }> | null> {
  if (!input.cacheRepository.enabled) {
    return null;
  }

  try {
    return await input.cacheRepository.findFreshSummary({
      ...input.cacheKey,
      encryptionKey: input.encryptionKey,
    });
  } catch {
    return null;
  }
}

async function storeCachedSummary(input: {
  cacheKey: AiSummaryCacheKey;
  cacheRepository: AiSummaryCacheRepository;
  encryptionKey: string;
  result: Extract<TicketAiSummaryResult, { status: "available" }>;
}): Promise<void> {
  if (!input.cacheRepository.enabled) {
    return;
  }

  try {
    await input.cacheRepository.storeSummary({
      ...input.cacheKey,
      encryptionKey: input.encryptionKey,
      result: input.result,
    });
  } catch {
    return;
  }
}

export async function summarizeTicketDetail(
  config: AiRuntimeConfig,
  detail: TicketDetail,
  cacheOptions?: TicketSummaryCacheOptions,
): Promise<TicketAiSummaryResult> {
  const totalStart = aiGenerationTimingStart();
  if (config.status === "unconfigured") {
    recordAiGenerationTiming({
      durationMs: aiGenerationTimingDuration(totalStart),
      operation: "ticket-summary",
      phase: "configuration",
      reason: config.reason,
      retryable: false,
      status: "unconfigured",
    });
    return {
      status: "unconfigured",
      reason: config.reason,
      retryable: false,
    };
  }

  const promptStart = aiGenerationTimingStart();
  const context = ticketSummaryPromptContext(detail);
  if (!context.prompt.trim()) {
    recordAiGenerationTiming({
      durationMs: aiGenerationTimingDuration(promptStart),
      operation: "ticket-summary",
      phase: "prompt-context",
      providerProtocol: config.provider,
      reason: "empty-ticket",
      retryable: false,
      status: "unavailable",
    });
    return { status: "unavailable", reason: "empty-ticket", retryable: false };
  }
  recordAiGenerationTiming({
    durationMs: aiGenerationTimingDuration(promptStart),
    operation: "ticket-summary",
    phase: "prompt-context",
    providerProtocol: config.provider,
    status: "ok",
  });

  const cacheRepository =
    cacheOptions?.cacheRepository ?? noAiSummaryCacheRepository;
  const cacheKey = cacheOptions && config.status === "available"
    ? aiSummaryCacheKey({
        config,
        context,
        encryptionKey: cacheOptions.encryptionKey,
        scope: cacheOptions.scope,
      })
    : undefined;
  if (cacheKey && cacheOptions) {
    const cached = await readCachedSummary({
      cacheKey,
      cacheRepository,
      encryptionKey: cacheOptions.encryptionKey,
    });
    if (cached) {
      recordAiGenerationTiming({
        durationMs: aiGenerationTimingDuration(totalStart),
        operation: "ticket-summary",
        phase: "total-generation",
        providerProtocol: config.provider,
        status: "ok",
      });
      return cached;
    }
  }

  const result = await generateAiText(config, {
    maxOutputTokens: 260,
    systemInstruction: summarySystemInstruction,
    telemetryOperation: "ticket-summary",
    userPrompt: context.prompt,
  });
  if (result.status === "unavailable") {
    recordAiGenerationTiming({
      durationMs: aiGenerationTimingDuration(totalStart),
      operation: "ticket-summary",
      phase: "total-generation",
      providerProtocol: config.provider,
      reason: result.reason,
      retryable: result.retryable,
      status: "unavailable",
    });
    return result;
  }

  recordAiGenerationTiming({
    durationMs: aiGenerationTimingDuration(totalStart),
    operation: "ticket-summary",
    phase: "total-generation",
    providerProtocol: config.provider,
    status: "ok",
  });

  const summaryResult = {
    status: "available",
    generatedAt: new Date().toISOString(),
    source: {
      articleCount: context.articleCount,
      ticketNumber: context.ticketNumber,
      ticketUpdatedAt: context.ticketUpdatedAt,
    },
    summary: result.text,
  } satisfies Extract<TicketAiSummaryResult, { status: "available" }>;

  if (cacheKey && cacheOptions) {
    await storeCachedSummary({
      cacheKey,
      cacheRepository,
      encryptionKey: cacheOptions.encryptionKey,
      result: summaryResult,
    });
  }

  return summaryResult;
}

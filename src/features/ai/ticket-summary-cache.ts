import type { TicketDetail } from "@/core/tickets";
import {
  aiGenerationTimingDuration,
  aiGenerationTimingStart,
  recordAiGenerationTiming,
} from "@/telemetry/ai-generation-timing";
import type { TicketAiSummaryResult } from "./model";
import type { EffectiveAiPrompt } from "./prompt-service";
import {
  ticketSummaryDefaultPrompt,
  ticketSummaryPromptVersion,
} from "./prompt-registry";
import type { AiRuntimeConfig } from "./provider-config";
import { aiSummaryCacheKey } from "./summary-cache-key";
import {
  noAiSummaryCacheRepository,
  type AiSummaryCacheKey,
  type AiSummaryCacheRepository,
} from "./summary-cache-repository";
import { ticketSummaryPromptContext } from "./ticket-summary-context";

export type TicketSummaryCacheOptions = {
  cacheRepository?: AiSummaryCacheRepository;
  encryptionKey: string;
  scope: {
    helpdeskConnectionId: string;
    ticketExternalId: string;
    userId: string;
  };
};

export async function readCachedSummary(input: {
  cacheKey: AiSummaryCacheKey;
  cacheRepository: AiSummaryCacheRepository;
  encryptionKey: string;
  providerProtocol: "anthropic-compatible" | "openai-compatible";
}): Promise<Extract<TicketAiSummaryResult, { status: "available" }> | null> {
  if (!input.cacheRepository.enabled) {
    return null;
  }

  const start = aiGenerationTimingStart();
  try {
    const cacheResult = await input.cacheRepository.readSummary({
      ...input.cacheKey,
      encryptionKey: input.encryptionKey,
    });
    recordAiGenerationTiming({
      cacheDataKind: "ai-summary",
      cacheEvent: cacheResult.status,
      durationMs: aiGenerationTimingDuration(start),
      freshnessAgeBucket: cacheResult.ageBucket,
      operation: "ticket-summary",
      phase: "summary-cache-read",
      providerProtocol: input.providerProtocol,
      status: cacheResult.status === "hit" ? "ok" : "unavailable",
    });
    return cacheResult.status === "hit" ? cacheResult.result : null;
  } catch {
    recordAiGenerationTiming({
      cacheDataKind: "ai-summary",
      cacheEvent: "read-failed",
      durationMs: aiGenerationTimingDuration(start),
      operation: "ticket-summary",
      phase: "summary-cache-read",
      providerProtocol: input.providerProtocol,
      reason: "cache-error",
      retryable: true,
      status: "unavailable",
    });
    return null;
  }
}

export async function storeCachedSummary(input: {
  cacheKey: AiSummaryCacheKey;
  cacheRepository: AiSummaryCacheRepository;
  encryptionKey: string;
  providerProtocol: "anthropic-compatible" | "openai-compatible";
  result: Extract<TicketAiSummaryResult, { status: "available" }>;
}): Promise<void> {
  if (!input.cacheRepository.enabled) {
    return;
  }

  const start = aiGenerationTimingStart();
  try {
    await input.cacheRepository.storeSummary({
      ...input.cacheKey,
      encryptionKey: input.encryptionKey,
      result: input.result,
    });
    recordAiGenerationTiming({
      cacheDataKind: "ai-summary",
      cacheEvent: "write-succeeded",
      durationMs: aiGenerationTimingDuration(start),
      operation: "ticket-summary",
      phase: "summary-cache-write",
      providerProtocol: input.providerProtocol,
      status: "ok",
    });
  } catch {
    recordAiGenerationTiming({
      cacheDataKind: "ai-summary",
      cacheEvent: "write-failed",
      durationMs: aiGenerationTimingDuration(start),
      operation: "ticket-summary",
      phase: "summary-cache-write",
      providerProtocol: input.providerProtocol,
      reason: "cache-error",
      retryable: true,
      status: "unavailable",
    });
  }
}

export async function readCachedTicketSummary(
  config: AiRuntimeConfig,
  detail: TicketDetail,
  cacheOptions: TicketSummaryCacheOptions | undefined,
  prompt: Pick<EffectiveAiPrompt, "prompt" | "version"> = {
    prompt: ticketSummaryDefaultPrompt,
    version: ticketSummaryPromptVersion,
  },
): Promise<Extract<TicketAiSummaryResult, { status: "available" }> | undefined> {
  if (config.status !== "available" || !cacheOptions) {
    return undefined;
  }

  const context = ticketSummaryPromptContext(detail);
  if (!context.prompt.trim()) {
    return undefined;
  }

  return (
    (await readCachedSummary({
      cacheKey: aiSummaryCacheKey({
        config,
        context,
        encryptionKey: cacheOptions.encryptionKey,
        prompt,
        scope: cacheOptions.scope,
      }),
      cacheRepository:
        cacheOptions.cacheRepository ?? noAiSummaryCacheRepository,
      encryptionKey: cacheOptions.encryptionKey,
      providerProtocol: config.provider,
    })) ?? undefined
  );
}

import type { TicketDetail } from "@/core/tickets";
import { ticketSummaryPromptContext } from "./ticket-summary-context";
import type { TicketAiSummaryResult } from "./model";
import type { AiRuntimeConfig } from "./provider-config";
import { generateAiText } from "./text-generation";
import { aiSummaryCacheKey } from "./summary-cache-key";
import {
  ticketSummaryDefaultPrompt,
  ticketSummaryPromptVersion,
} from "./prompt-registry";
import {
  parseTicketSummaryOutput,
  ticketSummarySystemInstruction,
} from "./ticket-summary-structure";
import type { TicketAiSummaryContent } from "./ticket-summary-content";
import type { EffectiveAiPrompt } from "./prompt-service";
import {
  readCachedSummary,
  storeCachedSummary,
  type TicketSummaryCacheOptions,
} from "./ticket-summary-cache";
import { noAiSummaryCacheRepository } from "./summary-cache-repository";
import {
  aiGenerationTimingDuration,
  aiGenerationTimingStart,
  recordAiGenerationTiming,
} from "@/telemetry/ai-generation-timing";

async function generateStructuredSummary(
  config: Extract<AiRuntimeConfig, { status: "available" }>,
  workspaceGuidance: string,
  ticketContext: string,
): Promise<
  | { status: "available"; summary: TicketAiSummaryContent }
  | Exclude<TicketAiSummaryResult, { status: "available" | "unconfigured" }>
> {
  for (const repairAttempt of [false, true]) {
    const result = await generateAiText(config, {
      maxOutputTokens: 500,
      systemInstruction: ticketSummarySystemInstruction(
        workspaceGuidance,
        repairAttempt,
      ),
      telemetryOperation: "ticket-summary",
      userPrompt: ticketContext,
    });
    if (result.status === "unavailable") {
      return result;
    }
    const summary = parseTicketSummaryOutput(result.text);
    if (summary) {
      return { status: "available", summary };
    }
  }
  return {
    status: "unavailable",
    reason: "provider-invalid-response",
    retryable: true,
  };
}

export async function summarizeTicketDetail(
  config: AiRuntimeConfig,
  detail: TicketDetail,
  cacheOptions?: TicketSummaryCacheOptions,
  prompt: Pick<EffectiveAiPrompt, "prompt" | "version"> = {
    prompt: ticketSummaryDefaultPrompt,
    version: ticketSummaryPromptVersion,
  },
  options: { forceRefresh?: boolean } = {},
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
        prompt,
        scope: cacheOptions.scope,
      })
    : undefined;
  if (cacheKey && cacheOptions && !options.forceRefresh) {
    const cached = await readCachedSummary({
      cacheKey,
      cacheRepository,
      encryptionKey: cacheOptions.encryptionKey,
      providerProtocol: config.provider,
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

  recordAiGenerationTiming({
    cacheDataKind: "ai-summary",
    cacheEvent: "regeneration-started",
    durationMs: 0,
    operation: "ticket-summary",
    phase: "summary-cache-regeneration",
    providerProtocol: config.provider,
    status: "ok",
  });
  const regenerationStart = aiGenerationTimingStart();
  const result = await generateStructuredSummary(
    config,
    prompt.prompt,
    context.prompt,
  );
  if (result.status === "unavailable") {
    recordAiGenerationTiming({
      cacheDataKind: "ai-summary",
      cacheEvent: "regeneration-failed",
      durationMs: aiGenerationTimingDuration(regenerationStart),
      operation: "ticket-summary",
      phase: "summary-cache-regeneration",
      providerProtocol: config.provider,
      reason: result.reason,
      retryable: result.retryable,
      status: "unavailable",
    });
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
    cacheDataKind: "ai-summary",
    cacheEvent: "regeneration-succeeded",
    durationMs: aiGenerationTimingDuration(regenerationStart),
    operation: "ticket-summary",
    phase: "summary-cache-regeneration",
    providerProtocol: config.provider,
    status: "ok",
  });
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
    summary: result.summary,
  } satisfies Extract<TicketAiSummaryResult, { status: "available" }>;

  if (cacheKey && cacheOptions) {
    await storeCachedSummary({
      cacheKey,
      cacheRepository,
      encryptionKey: cacheOptions.encryptionKey,
      providerProtocol: config.provider,
      result: summaryResult,
    });
  }

  return summaryResult;
}

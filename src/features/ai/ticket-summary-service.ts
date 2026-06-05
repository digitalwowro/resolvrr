import type { TicketDetail } from "@/core/tickets";
import { ticketSummaryPromptContext } from "./ticket-summary-context";
import type { TicketAiSummaryResult } from "./model";
import type { AiRuntimeConfig } from "./provider-config";
import { generateAiText } from "./text-generation";
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

export async function summarizeTicketDetail(
  config: AiRuntimeConfig,
  detail: TicketDetail,
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

  return {
    status: "available",
    generatedAt: new Date().toISOString(),
    source: {
      articleCount: context.articleCount,
      ticketNumber: context.ticketNumber,
      ticketUpdatedAt: context.ticketUpdatedAt,
    },
    summary: result.text,
  };
}

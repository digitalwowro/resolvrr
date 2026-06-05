import type { TicketDetail } from "@/core/tickets";
import { ticketSummaryPromptContext } from "./ticket-summary-context";
import type { TicketAiSummaryResult } from "./model";
import type { AiRuntimeConfig } from "./provider-config";
import { generateAiText } from "./text-generation";

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
  if (config.status === "unconfigured") {
    return {
      status: "unconfigured",
      reason: config.reason,
      retryable: false,
    };
  }

  const context = ticketSummaryPromptContext(detail);
  if (!context.prompt.trim()) {
    return { status: "unavailable", reason: "empty-ticket", retryable: false };
  }

  const result = await generateAiText(config, {
    maxOutputTokens: 260,
    systemInstruction: summarySystemInstruction,
    userPrompt: context.prompt,
  });
  if (result.status === "unavailable") {
    return result;
  }

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

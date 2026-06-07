import { createHmac } from "node:crypto";
import type { AiRuntimeConfig } from "./provider-config";
import type { AiSummaryCacheKey } from "./summary-cache-repository";
import {
  ticketSummarySanitizationVersion,
  type TicketSummaryPromptContext,
} from "./ticket-summary-context";
import type { EffectiveAiPrompt } from "./prompt-service";

type AvailableAiRuntimeConfig = Extract<AiRuntimeConfig, { status: "available" }>;

type AiSummaryCacheScope = {
  helpdeskConnectionId: string;
  ticketExternalId: string;
  userId: string;
};

function fingerprint(encryptionKey: string, label: string, value: string) {
  return createHmac("sha256", encryptionKey)
    .update(label)
    .update("\0")
    .update(value)
    .digest("hex");
}

export function aiSummaryCacheKey(input: {
  config: AvailableAiRuntimeConfig;
  context: TicketSummaryPromptContext;
  encryptionKey: string;
  prompt: Pick<EffectiveAiPrompt, "prompt" | "version">;
  scope: AiSummaryCacheScope;
}): AiSummaryCacheKey {
  return {
    helpdeskConnectionId: input.scope.helpdeskConnectionId,
    modelFingerprint: fingerprint(
      input.encryptionKey,
      "ai-summary-model",
      [
        input.config.provider,
        input.config.baseUrl,
        input.config.model,
      ].join("\n"),
    ),
    operation: "ticket-summary",
    promptVersion: input.prompt.version,
    providerProtocol: input.config.provider,
    sanitizationVersion: ticketSummarySanitizationVersion,
    sourceFingerprint: fingerprint(
      input.encryptionKey,
      "ai-summary-source",
      [
        input.prompt.version,
        input.prompt.prompt,
        ticketSummarySanitizationVersion,
        input.context.ticketUpdatedAt,
        String(input.context.articleCount),
        input.context.prompt,
      ].join("\n"),
    ),
    ticketExternalId: input.scope.ticketExternalId,
    userId: input.scope.userId,
  };
}

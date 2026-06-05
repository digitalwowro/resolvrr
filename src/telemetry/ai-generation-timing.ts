import { safeLogMetadata } from "@/security/safe-log";

export type AiGenerationOperation = "ticket-summary";

export type AiGenerationPhase =
  | "configuration"
  | "prompt-context"
  | "provider-request"
  | "total-generation";

export type AiGenerationStatus = "ok" | "unavailable" | "unconfigured";
export type AiGenerationProviderProtocol =
  | "anthropic-compatible"
  | "openai-compatible";

export type AiGenerationTimingInput = {
  durationMs: number;
  operation: AiGenerationOperation;
  phase: AiGenerationPhase;
  providerProtocol?: AiGenerationProviderProtocol;
  reason?: string;
  retryable?: boolean;
  status: AiGenerationStatus;
};

export function aiGenerationTimingStart() {
  return performance.now();
}

export function aiGenerationTimingDuration(start: number) {
  return Math.round((performance.now() - start) * 100) / 100;
}

export function recordAiGenerationTiming(input: AiGenerationTimingInput): void {
  console.info(
    "AI generation timing",
    safeLogMetadata({
      durationMs: input.durationMs,
      operation: input.operation,
      phase: input.phase,
      providerProtocol: input.providerProtocol,
      reason: input.reason,
      retryable: input.retryable,
      status: input.status,
    }),
  );
}

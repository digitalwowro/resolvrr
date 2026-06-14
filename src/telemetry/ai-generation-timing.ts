import { safeLogMetadata } from "@/security/safe-log";

export type AiGenerationOperation =
  | "draft-proofread"
  | "draft-rephrase"
  | "ticket-summary";

export type AiGenerationPhase =
  | "configuration"
  | "summary-cache-read"
  | "summary-cache-regeneration"
  | "summary-cache-write"
  | "prompt-context"
  | "provider-request"
  | "total-generation";

export type AiGenerationStatus = "ok" | "unavailable" | "unconfigured";
export type AiGenerationCacheDataKind = "ai-summary";
export type AiGenerationCacheEvent =
  | "hit"
  | "miss"
  | "read-failed"
  | "regeneration-failed"
  | "regeneration-started"
  | "regeneration-succeeded"
  | "stale"
  | "write-failed"
  | "write-succeeded";
export type AiGenerationProviderProtocol =
  | "anthropic-compatible"
  | "openai-compatible";

export type AiGenerationTimingInput = {
  cacheDataKind?: AiGenerationCacheDataKind;
  cacheEvent?: AiGenerationCacheEvent;
  durationMs: number;
  freshnessAgeBucket?: string;
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
      cacheDataKind: input.cacheDataKind,
      cacheEvent: input.cacheEvent,
      durationMs: input.durationMs,
      freshnessAgeBucket: input.freshnessAgeBucket,
      operation: input.operation,
      phase: input.phase,
      providerProtocol: input.providerProtocol,
      reason: input.reason,
      retryable: input.retryable,
      status: input.status,
    }),
  );
}

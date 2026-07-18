import type { AiRuntimeConfig } from "./provider-config";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import {
  safeProviderJson,
  type SafeProviderJsonResult,
} from "@/security/provider-http";
import type {
  AiGenerationOperation,
  AiGenerationProviderProtocol,
} from "@/telemetry/ai-generation-timing";
import {
  aiGenerationTimingDuration,
  aiGenerationTimingStart,
  recordAiGenerationTiming,
} from "@/telemetry/ai-generation-timing";
import {
  aiProviderFailureForStatus,
  temporaryAiProviderFailure,
  type AiTextUnavailableResult,
} from "./text-generation-errors";
import { providerErrorMetadata } from "./provider-error-metadata";
import {
  anthropicResponseWasTruncated,
  extractAnthropicText,
  extractOpenAiText,
  openAiResponseWasTruncated,
} from "./text-generation-response";

const maxAiProviderResponseBytes = 256 * 1024;

export type AiTextGenerationResult =
  | { status: "available"; text: string }
  | AiTextUnavailableResult;

export type AiTextGenerationRequest = {
  maxOutputTokens: number;
  systemInstruction: string;
  telemetryOperation?: AiGenerationOperation;
  userPrompt: string;
};

function endpoint(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path, normalizedBase).toString();
}

async function postJson(
  baseUrl: string,
  path: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<SafeProviderJsonResult | AiTextGenerationResult> {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), 30_000);
  try {
    const validated = await validateProviderBaseUrl(baseUrl);
    return await safeProviderJson(endpoint(validated.canonicalUrl, path), {
      allowedAddresses: validated.addresses,
      body: JSON.stringify(body),
      captureErrorJson: true,
      headers: { "Content-Type": "application/json", ...headers },
      maxResponseBytes: maxAiProviderResponseBytes,
      method: "POST",
      signal: controller.signal,
    });
  } catch {
    return temporaryAiProviderFailure();
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessTimeout(handler: () => void, timeoutMs: number) {
  return setTimeout(handler, timeoutMs);
}

function recordProviderRequestTiming(
  operation: AiGenerationOperation | undefined,
  providerProtocol: AiGenerationProviderProtocol,
  start: number,
  result: AiTextGenerationResult,
  metadata: {
    configurationVersion?: string;
    providerErrorCode?: string;
    providerErrorType?: string;
    providerStatusCode?: number;
  } = {},
): void {
  if (!operation) {
    return;
  }

  recordAiGenerationTiming({
    durationMs: aiGenerationTimingDuration(start),
    configurationVersion: metadata.configurationVersion,
    operation,
    phase: "provider-request",
    providerProtocol,
    providerErrorCode: metadata.providerErrorCode,
    providerErrorType: metadata.providerErrorType,
    providerStatusCode: metadata.providerStatusCode,
    reason: result.status === "unavailable" ? result.reason : undefined,
    retryable: result.status === "unavailable" ? result.retryable : undefined,
    status: result.status === "available" ? "ok" : "unavailable",
  });
}

async function openAiCompatibleText(
  config: Extract<AiRuntimeConfig, { provider: "openai-compatible" }>,
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  const start = aiGenerationTimingStart();
  const response = await postJson(
    config.baseUrl,
    "chat/completions",
    { Authorization: `Bearer ${config.apiKey}` },
    {
      max_completion_tokens: request.maxOutputTokens,
      messages: [
        { role: "developer", content: request.systemInstruction },
        { role: "user", content: request.userPrompt },
      ],
      model: config.model,
    },
  );
  if (typeof response.status !== "number") {
    recordProviderRequestTiming(
      request.telemetryOperation,
      config.provider,
      start,
      response,
      { configurationVersion: config.configurationVersion },
    );
    return response;
  }
  if (response.status < 200 || response.status >= 300) {
    const unavailable = aiProviderFailureForStatus(response.status);
    const errorMetadata = providerErrorMetadata(response.errorData);
    recordProviderRequestTiming(
      request.telemetryOperation,
      config.provider,
      start,
      unavailable,
      {
        configurationVersion: config.configurationVersion,
        providerErrorCode: errorMetadata.code,
        providerErrorType: errorMetadata.type,
        providerStatusCode: response.status,
      },
    );
    return unavailable;
  }
  const payload = response.data;
  if (payload === undefined) {
    const unavailable = temporaryAiProviderFailure();
    recordProviderRequestTiming(
      request.telemetryOperation,
      config.provider,
      start,
      unavailable,
      { configurationVersion: config.configurationVersion },
    );
    return unavailable;
  }
  const text = openAiResponseWasTruncated(payload)
    ? undefined
    : extractOpenAiText(payload);
  const result = text
    ? { status: "available" as const, text }
    : temporaryAiProviderFailure();
  recordProviderRequestTiming(
    request.telemetryOperation,
    config.provider,
    start,
    result,
    { configurationVersion: config.configurationVersion },
  );
  return result;
}

async function anthropicCompatibleText(
  config: Extract<AiRuntimeConfig, { provider: "anthropic-compatible" }>,
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  const start = aiGenerationTimingStart();
  const response = await postJson(
    config.baseUrl,
    "messages",
    {
      "anthropic-version": "2023-06-01",
      "x-api-key": config.apiKey,
    },
    {
      max_tokens: request.maxOutputTokens,
      messages: [{ role: "user", content: request.userPrompt }],
      model: config.model,
      system: request.systemInstruction,
    },
  );
  if (typeof response.status !== "number") {
    recordProviderRequestTiming(
      request.telemetryOperation,
      config.provider,
      start,
      response,
      { configurationVersion: config.configurationVersion },
    );
    return response;
  }
  if (response.status < 200 || response.status >= 300) {
    const unavailable = aiProviderFailureForStatus(response.status);
    const errorMetadata = providerErrorMetadata(response.errorData);
    recordProviderRequestTiming(
      request.telemetryOperation,
      config.provider,
      start,
      unavailable,
      {
        configurationVersion: config.configurationVersion,
        providerErrorCode: errorMetadata.code,
        providerErrorType: errorMetadata.type,
        providerStatusCode: response.status,
      },
    );
    return unavailable;
  }
  const payload = response.data;
  if (payload === undefined) {
    const unavailable = temporaryAiProviderFailure();
    recordProviderRequestTiming(
      request.telemetryOperation,
      config.provider,
      start,
      unavailable,
      { configurationVersion: config.configurationVersion },
    );
    return unavailable;
  }
  const text = anthropicResponseWasTruncated(payload)
    ? undefined
    : extractAnthropicText(payload);
  const result = text
    ? { status: "available" as const, text }
    : temporaryAiProviderFailure();
  recordProviderRequestTiming(
    request.telemetryOperation,
    config.provider,
    start,
    result,
    { configurationVersion: config.configurationVersion },
  );
  return result;
}

export async function generateAiText(
  config: Extract<AiRuntimeConfig, { status: "available" }>,
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  return config.provider === "openai-compatible"
    ? openAiCompatibleText(config, request)
    : anthropicCompatibleText(config, request);
}

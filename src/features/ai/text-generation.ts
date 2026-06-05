import type { AiRuntimeConfig } from "./provider-config";

type AiTextUnavailableReason =
  | "provider-auth-failed"
  | "provider-rate-limited"
  | "provider-temporary-failure";

export type AiTextGenerationResult =
  | { status: "available"; text: string }
  | {
      status: "unavailable";
      reason: AiTextUnavailableReason;
      retryable: boolean;
    };

export type AiTextGenerationRequest = {
  maxOutputTokens: number;
  systemInstruction: string;
  userPrompt: string;
};

function endpoint(baseUrl: string, path: string): string {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return new URL(path, normalizedBase).toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function unavailableForStatus(status: number): AiTextGenerationResult {
  if (status === 401 || status === 403) {
    return {
      status: "unavailable",
      reason: "provider-auth-failed",
      retryable: false,
    };
  }
  if (status === 429) {
    return {
      status: "unavailable",
      reason: "provider-rate-limited",
      retryable: true,
    };
  }
  return {
    status: "unavailable",
    reason: "provider-temporary-failure",
    retryable: status === 408 || status >= 500,
  };
}

async function postJson(
  url: string,
  headers: Record<string, string>,
  body: unknown,
): Promise<Response | AiTextGenerationResult> {
  const controller = new AbortController();
  const timeout = windowlessTimeout(() => controller.abort(), 30_000);
  try {
    return await fetch(url, {
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json", ...headers },
      method: "POST",
      signal: controller.signal,
    });
  } catch {
    return {
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function windowlessTimeout(handler: () => void, timeoutMs: number) {
  return setTimeout(handler, timeoutMs);
}

function extractOpenAiText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.choices)) {
    return undefined;
  }
  const [choice] = payload.choices;
  if (!isRecord(choice) || !isRecord(choice.message)) {
    return undefined;
  }
  const { content } = choice.message;
  if (typeof content === "string") {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) =>
        isRecord(part) && typeof part.text === "string" ? part.text : "",
      )
      .join("")
      .trim();
  }
  return undefined;
}

function extractAnthropicText(payload: unknown): string | undefined {
  if (!isRecord(payload) || !Array.isArray(payload.content)) {
    return undefined;
  }
  return payload.content
    .map((part) =>
      isRecord(part) && part.type === "text" && typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("")
    .trim();
}

async function openAiCompatibleText(
  config: Extract<AiRuntimeConfig, { provider: "openai-compatible" }>,
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  const response = await postJson(
    endpoint(config.baseUrl, "chat/completions"),
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
  if (!(response instanceof Response)) {
    return response;
  }
  if (!response.ok) {
    return unavailableForStatus(response.status);
  }
  const text = extractOpenAiText(await response.json());
  return text
    ? { status: "available", text }
    : {
        status: "unavailable",
        reason: "provider-temporary-failure",
        retryable: true,
      };
}

async function anthropicCompatibleText(
  config: Extract<AiRuntimeConfig, { provider: "anthropic-compatible" }>,
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  const response = await postJson(
    endpoint(config.baseUrl, "messages"),
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
  if (!(response instanceof Response)) {
    return response;
  }
  if (!response.ok) {
    return unavailableForStatus(response.status);
  }
  const text = extractAnthropicText(await response.json());
  return text
    ? { status: "available", text }
    : {
        status: "unavailable",
        reason: "provider-temporary-failure",
        retryable: true,
      };
}

export async function generateAiText(
  config: Extract<AiRuntimeConfig, { status: "available" }>,
  request: AiTextGenerationRequest,
): Promise<AiTextGenerationResult> {
  return config.provider === "openai-compatible"
    ? openAiCompatibleText(config, request)
    : anthropicCompatibleText(config, request);
}

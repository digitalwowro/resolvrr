import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateAiText } from "@/features/ai/text-generation";
import { safeProviderJson } from "@/security/provider-http";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(async (input: string) => ({
    addresses: ["203.0.113.10"],
    canonicalUrl: input.replace(/\/+$/u, ""),
  })),
}));

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
});

const request = {
  maxOutputTokens: 80,
  systemInstruction: "Summarize.",
  userPrompt: "Ticket body",
};

describe("AI text generation adapters", () => {
  it("calls OpenAI-compatible chat completions without storing output", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: "Situation: Login issue" } }],
      },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText({
        status: "available",
        apiKey: "openai-key",
        baseUrl: "https://api.openai.test/v1",
        model: "support-model",
        provider: "openai-compatible",
      }, request),
    ).resolves.toEqual({ status: "available", text: "Situation: Login issue" });

    expect(safeProviderJson).toHaveBeenCalledWith(
      "https://api.openai.test/v1/chat/completions",
      expect.objectContaining({
        allowedAddresses: ["203.0.113.10"],
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer openai-key",
          "Content-Type": "application/json",
        }),
        maxResponseBytes: 256 * 1024,
      }),
    );
  });

  it("maps malformed OpenAI-compatible responses to temporary failure", async () => {
    vi.mocked(safeProviderJson).mockRejectedValueOnce(new Error("invalid-json"));

    await expect(
      generateAiText({
        status: "available",
        apiKey: "openai-key",
        baseUrl: "https://api.openai.test/v1",
        model: "support-model",
        provider: "openai-compatible",
      }, request),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });

  it("rejects truncated OpenAI-compatible output", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{
          finish_reason: "length",
          message: { content: "partial output" },
        }],
      },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText({
        status: "available",
        apiKey: "openai-key",
        baseUrl: "https://api.openai.test/v1",
        model: "support-model",
        provider: "openai-compatible",
      }, request),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });

  it("calls Anthropic-compatible messages with its API version header", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        content: [{ type: "text", text: "Situation: Login issue" }],
      },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText({
        status: "available",
        apiKey: "anthropic-key",
        baseUrl: "https://api.anthropic.test/v1",
        model: "support-model",
        provider: "anthropic-compatible",
      }, request),
    ).resolves.toEqual({ status: "available", text: "Situation: Login issue" });

    expect(safeProviderJson).toHaveBeenCalledWith(
      "https://api.anthropic.test/v1/messages",
      expect.objectContaining({
        allowedAddresses: ["203.0.113.10"],
        method: "POST",
        headers: expect.objectContaining({
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          "x-api-key": "anthropic-key",
        }),
      }),
    );
  });

  it("maps Anthropic-compatible responses without text to failure", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: { content: [{ type: "image" }] },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText({
        status: "available",
        apiKey: "anthropic-key",
        baseUrl: "https://api.anthropic.test/v1",
        model: "support-model",
        provider: "anthropic-compatible",
      }, request),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });

  it("rejects truncated Anthropic-compatible output", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        content: [{ type: "text", text: "partial output" }],
        stop_reason: "max_tokens",
      },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText({
        status: "available",
        apiKey: "anthropic-key",
        baseUrl: "https://api.anthropic.test/v1",
        model: "support-model",
        provider: "anthropic-compatible",
      }, request),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });
});

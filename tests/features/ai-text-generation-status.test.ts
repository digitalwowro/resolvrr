import { beforeEach, describe, expect, it, vi } from "vitest";
import { generateAiText } from "@/features/ai/text-generation";
import { safeProviderJson } from "@/security/provider-http";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(async (input: string) => ({
    addresses: ["203.0.113.10"],
    canonicalUrl: input,
  })),
}));
vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
}));

const config = {
  status: "available" as const,
  apiKey: "redacted-test-key",
  baseUrl: "https://api.example.test/v1",
  configurationVersion: "config-version-1",
  model: "support-model",
  provider: "openai-compatible" as const,
};
const request = {
  maxOutputTokens: 20,
  systemInstruction: "Proofread.",
  telemetryOperation: "draft-proofread" as const,
  userPrompt: "Draft.",
};

describe("AI provider HTTP status classification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps 401 as a credential failure and logs only safe error metadata", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      errorData: {
        error: {
          code: "invalid_api_key",
          message: "Sensitive provider response",
          type: "authentication_error",
        },
      },
      headers: new Headers(),
      status: 401,
    });

    await expect(generateAiText(config, request)).resolves.toEqual({
      status: "unavailable",
      reason: "provider-auth-failed",
      retryable: false,
    });
    expect(info).toHaveBeenCalledWith(
      "AI generation timing",
      expect.objectContaining({
        configurationVersion: "config-version-1",
        providerErrorCode: "invalid_api_key",
        providerErrorType: "authentication_error",
        providerStatusCode: 401,
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "Sensitive provider response",
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("redacted-test-key");
  });

  it("classifies 403 as request rejection and records only its status", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      headers: new Headers(),
      status: 403,
    });

    await expect(generateAiText(config, request)).resolves.toEqual({
      status: "unavailable",
      reason: "provider-request-rejected",
      retryable: false,
    });
    expect(info).toHaveBeenCalledWith(
      "AI generation timing",
      expect.objectContaining({
        providerStatusCode: 403,
        reason: "provider-request-rejected",
      }),
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("redacted-test-key");
  });
});

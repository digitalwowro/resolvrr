import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateAiProviderConfig } from "@/features/ai/settings-live-validation";
import { generateAiText } from "@/features/ai/text-generation";

vi.mock("@/features/ai/text-generation", () => ({
  generateAiText: vi.fn(async () => ({ status: "available", text: "OK" })),
}));

const baseConfig = {
  apiKey: "ai-key",
  baseUrl: "https://api.example.test/v1",
  model: "support-model",
  status: "available" as const,
};

describe("workspace AI settings live validation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["openai-compatible", "anthropic-compatible"] as const)(
    "accepts valid %s provider settings",
    async (provider) => {
      await expect(
        validateAiProviderConfig({ ...baseConfig, provider }),
      ).resolves.toBeNull();

      expect(generateAiText).toHaveBeenCalledWith(
        expect.objectContaining({ provider }),
        expect.objectContaining({ maxOutputTokens: 8 }),
      );
    },
  );

  it.each(["openai-compatible", "anthropic-compatible"] as const)(
    "maps invalid %s provider settings to a settings action code",
    async (provider) => {
      vi.mocked(generateAiText).mockResolvedValueOnce({
        reason: "provider-auth-failed",
        retryable: false,
        status: "unavailable",
      });

      await expect(
        validateAiProviderConfig({ ...baseConfig, provider }),
      ).resolves.toBe("provider-auth-failed");
    },
  );
});

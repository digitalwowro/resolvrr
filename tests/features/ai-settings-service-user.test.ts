import { beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret } from "@/security/encryption";
import {
  saveUserWorkspaceAiSettings,
  saveWorkspaceAiSettings,
} from "@/features/ai/settings-mutation-service";
import { generateAiText } from "@/features/ai/text-generation";
import {
  aiSettingsRepository,
  aiSummaryCache,
  connectionRepository,
  encryptionKey,
  form,
  user,
} from "./ai-settings-service-test-helpers";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(async (input: string) => ({
    addresses: ["198.51.100.10"],
    canonicalUrl: input.replace(/\/+$/u, ""),
  })),
}));

vi.mock("@/features/ai/text-generation", () => ({
  generateAiText: vi.fn(async () => ({ status: "available", text: "OK" })),
}));

describe("workspace AI user settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lets users save their own key only when workspace policy requires it", async () => {
    const repository = aiSettingsRepository();
    repository.workspaceSetting = {
      allowUserPromptOverrides: false,
      config: null,
      helpdeskConnectionId: "connection-1",
      policy: "user-provided",
    };
    const cache = aiSummaryCache();

    const result = await saveUserWorkspaceAiSettings({
      aiSummaryCacheRepository: cache,
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({
        apiKey: "anthropic-key",
        baseUrl: "https://api.anthropic.test/v1",
        model: "support-model",
        providerProtocol: "anthropic-compatible",
      }),
      repository,
      user: user("USER"),
    });

    expect(result.ok).toBe(true);
    expect(cache.invalidateConnection).toHaveBeenCalledWith({
      helpdeskConnectionId: "connection-1",
      userId: "user-1",
    });
    expect(decryptSecret(repository.userSetting?.encryptedApiKey ?? "", encryptionKey))
      .toBe("anthropic-key");
  });

  it("does not persist secrets when live validation fails", async () => {
    vi.mocked(generateAiText).mockResolvedValueOnce({
      reason: "provider-auth-failed",
      retryable: false,
      status: "unavailable",
    });
    const repository = aiSettingsRepository();

    const result = await saveWorkspaceAiSettings({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({
        apiKey: "bad-key",
        baseUrl: "https://api.openai.test/v1",
        model: "support-model",
        policy: "admin-managed",
        providerProtocol: "openai-compatible",
      }),
      repository,
      user: user("ADMIN"),
    });

    expect(result).toMatchObject({ code: "provider-auth-failed", ok: false });
    expect(repository.workspaceSetting).toBeNull();
  });
});

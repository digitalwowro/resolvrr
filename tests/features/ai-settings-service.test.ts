import { beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import {
  resolveWorkspaceAiRuntimeConfig,
} from "@/features/ai/settings-service";
import { saveWorkspaceAiSettings } from "@/features/ai/settings-mutation-service";
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

describe("workspace AI settings service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves disabled, admin-managed, and missing user-provided runtime config", async () => {
    const repository = aiSettingsRepository();

    await expect(
      resolveWorkspaceAiRuntimeConfig(
        repository,
        encryptionKey,
        "user-1",
        "connection-1",
      ),
    ).resolves.toEqual({ status: "unconfigured", reason: "ai-disabled" });

    repository.workspaceSetting = {
      allowUserPromptOverrides: false,
      config: {
        baseUrl: "https://api.openai.test/v1",
        encryptedApiKey: encryptSecret("openai-key", encryptionKey),
        keyVersion: "v1",
        model: "support-model",
        providerProtocol: "openai-compatible",
      },
      helpdeskConnectionId: "connection-1",
      policy: "admin-managed",
    };
    await expect(
      resolveWorkspaceAiRuntimeConfig(
        repository,
        encryptionKey,
        "user-1",
        "connection-1",
      ),
    ).resolves.toMatchObject({
      apiKey: "openai-key",
      status: "available",
    });

    repository.workspaceSetting = {
      allowUserPromptOverrides: false,
      config: null,
      helpdeskConnectionId: "connection-1",
      policy: "user-provided",
    };
    await expect(
      resolveWorkspaceAiRuntimeConfig(
        repository,
        encryptionKey,
        "user-1",
        "connection-1",
      ),
    ).resolves.toEqual({
      status: "unconfigured",
      reason: "missing-user-ai-config",
    });
  });

  it("lets admins save workspace AI settings and invalidates workspace summaries", async () => {
    const repository = aiSettingsRepository();
    const cache = aiSummaryCache();

    const result = await saveWorkspaceAiSettings({
      aiSummaryCacheRepository: cache,
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({
        apiKey: "openai-key",
        baseUrl: "https://api.openai.test/v1/",
        model: "support-model",
        policy: "admin-managed",
        providerProtocol: "openai-compatible",
      }),
      repository,
      user: user("ADMIN"),
    });

    expect(result.ok).toBe(true);
    expect(generateAiText).toHaveBeenCalledOnce();
    expect(cache.invalidateWorkspace).toHaveBeenCalledWith({
      helpdeskConnectionId: "connection-1",
    });
    expect(repository.workspaceSetting?.policy).toBe("admin-managed");
    expect(
      decryptSecret(
        repository.workspaceSetting?.config?.encryptedApiKey ?? "",
        encryptionKey,
      ),
    ).toBe("openai-key");
  });

  it("rejects non-admin workspace AI policy changes", async () => {
    const repository = aiSettingsRepository();
    const result = await saveWorkspaceAiSettings({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({ policy: "disabled" }),
      repository,
      user: user("USER"),
    });

    expect(result).toMatchObject({ code: "not-admin", ok: false });
    expect(repository.workspaceSetting).toBeNull();
  });
});

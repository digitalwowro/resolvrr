import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/auth/types";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type {
  AiSettingsRepository,
  StoredWorkspaceAiSetting,
} from "@/features/ai/settings-repository";
import {
  resolveWorkspaceAiRuntimeConfig,
} from "@/features/ai/settings-service";
import {
  saveUserWorkspaceAiSettings,
  saveWorkspaceAiSettings,
} from "@/features/ai/settings-mutation-service";
import { generateAiText } from "@/features/ai/text-generation";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(async (input: string) => ({
    addresses: ["198.51.100.10"],
    canonicalUrl: input.replace(/\/+$/u, ""),
  })),
}));

vi.mock("@/features/ai/text-generation", () => ({
  generateAiText: vi.fn(async () => ({ status: "available", text: "OK" })),
}));

const encryptionKey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function user(role: AuthUser["role"] = "USER"): AuthUser {
  return {
    displayName: null,
    email: `${role.toLowerCase()}@example.com`,
    id: `${role.toLowerCase()}-1`,
    role,
  };
}

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

function connectionRepository(): HelpdeskConnectionsRepository {
  return {
    async clearActiveConnectionId() {},
    async create() {
      throw new Error("not used");
    },
    async deleteForUser() {
      return false;
    },
    async findForUser(userId, connectionId) {
      return {
        baseUrl: "https://helpdesk.example.com",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        credential: null,
        displayName: "Support",
        id: connectionId,
        providerKey: "example",
        status: "active",
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        userId,
      };
    },
    async getActiveConnectionId() {
      return "connection-1";
    },
    async listForUser() {
      return [];
    },
    async setActiveConnectionId() {},
    async update() {
      return null;
    },
    async updateStatus() {
      return false;
    },
  };
}

function aiSettingsRepository(): AiSettingsRepository & {
  userSetting: Awaited<ReturnType<AiSettingsRepository["getUserSetting"]>>;
  workspaceSetting: StoredWorkspaceAiSetting | null;
} {
  return {
    userSetting: null,
    workspaceSetting: null,
    async deleteUserSettingsForWorkspace() {
      this.userSetting = null;
    },
    async getUserSetting() {
      return this.userSetting;
    },
    async getWorkspaceSetting() {
      return this.workspaceSetting;
    },
    async upsertUserSetting(input) {
      this.userSetting = {
        baseUrl: input.baseUrl,
        encryptedApiKey: input.encryptedApiKey,
        keyVersion: input.keyVersion,
        model: input.model,
        providerProtocol: input.providerProtocol,
      };
    },
    async upsertWorkspaceSetting(input) {
      this.workspaceSetting = {
        config: input.config ?? null,
        helpdeskConnectionId: input.helpdeskConnectionId,
        policy: input.policy,
      };
    },
  };
}

function aiSummaryCache(): AiSummaryCacheRepository {
  return {
    enabled: true,
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicket: vi.fn(async () => undefined),
    invalidateWorkspace: vi.fn(async () => undefined),
    readSummary: vi.fn(async () => ({ status: "miss" as const })),
    storeSummary: vi.fn(async () => undefined),
  };
}

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

  it("lets users save their own key only when workspace policy requires it", async () => {
    const repository = aiSettingsRepository();
    repository.workspaceSetting = {
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

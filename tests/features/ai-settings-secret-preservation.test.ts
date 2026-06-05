import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/auth/types";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type {
  AiSettingsRepository,
  StoredWorkspaceAiSetting,
} from "@/features/ai/settings-repository";
import { saveWorkspaceAiSettings } from "@/features/ai/settings-mutation-service";
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

function admin(): AuthUser {
  return {
    displayName: null,
    email: "admin@example.com",
    id: "admin-1",
    role: "ADMIN",
  };
}

function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

const connectionRepository: HelpdeskConnectionsRepository = {
  async clearActiveConnectionId() {},
  async create() {
    throw new Error("not used");
  },
  async deleteForUser() {
    return false;
  },
  async findForUser() {
    return {
      baseUrl: "https://helpdesk.example.com",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      credential: null,
      displayName: "Support",
      id: "connection-1",
      providerKey: "example",
      status: "active",
      updatedAt: new Date("2026-06-01T00:00:00Z"),
      userId: "admin-1",
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

function repository(workspaceSetting: StoredWorkspaceAiSetting) {
  const repo: AiSettingsRepository & {
    workspaceSetting: StoredWorkspaceAiSetting;
  } = {
    workspaceSetting,
    async deleteUserSettingsForWorkspace() {},
    async getUserSetting() {
      return null;
    },
    async getWorkspaceSetting() {
      return repo.workspaceSetting;
    },
    async upsertUserSetting() {},
    async upsertWorkspaceSetting(input) {
      repo.workspaceSetting = {
        config: input.config ?? null,
        helpdeskConnectionId: input.helpdeskConnectionId,
        policy: input.policy,
      };
    },
  };
  return repo;
}

function aiSummaryCache(): AiSummaryCacheRepository {
  return {
    enabled: true,
    findFreshSummary: vi.fn(async () => null),
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicket: vi.fn(async () => undefined),
    invalidateWorkspace: vi.fn(async () => undefined),
    storeSummary: vi.fn(async () => undefined),
  };
}

describe("workspace AI settings secret preservation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("preserves the stored API key when admin-managed edits leave it blank", async () => {
    const encryptedApiKey = encryptSecret("existing-key", encryptionKey);
    const repo = repository({
      config: {
        baseUrl: "https://api.openai.test/v1",
        encryptedApiKey,
        keyVersion: "v1",
        model: "old-model",
        providerProtocol: "openai-compatible",
      },
      helpdeskConnectionId: "connection-1",
      policy: "admin-managed",
    });

    const result = await saveWorkspaceAiSettings({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository,
      encryptionKey,
      formData: form({
        apiKey: "",
        baseUrl: "https://api.openai.test/v2",
        model: "new-model",
        policy: "admin-managed",
        providerProtocol: "openai-compatible",
      }),
      repository: repo,
      user: admin(),
    });

    expect(result.ok).toBe(true);
    expect(generateAiText).toHaveBeenCalledWith(
      expect.objectContaining({ apiKey: "existing-key", model: "new-model" }),
      expect.any(Object),
    );
    expect(repo.workspaceSetting.config).toMatchObject({
      baseUrl: "https://api.openai.test/v2",
      encryptedApiKey,
      model: "new-model",
    });
    expect(
      decryptSecret(
        repo.workspaceSetting.config?.encryptedApiKey ?? "",
        encryptionKey,
      ),
    ).toBe("existing-key");
  });

  it("rejects blank-secret edits when the stored secret cannot be decrypted", async () => {
    const repo = repository({
      config: {
        baseUrl: "https://api.openai.test/v1",
        encryptedApiKey: "not-an-envelope",
        keyVersion: "v1",
        model: "old-model",
        providerProtocol: "openai-compatible",
      },
      helpdeskConnectionId: "connection-1",
      policy: "admin-managed",
    });

    const result = await saveWorkspaceAiSettings({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository,
      encryptionKey,
      formData: form({
        apiKey: "",
        baseUrl: "https://api.openai.test/v2",
        model: "new-model",
        policy: "admin-managed",
        providerProtocol: "openai-compatible",
      }),
      repository: repo,
      user: admin(),
    });

    expect(result).toMatchObject({ code: "invalid-ai-config", ok: false });
    expect(generateAiText).not.toHaveBeenCalled();
  });
});

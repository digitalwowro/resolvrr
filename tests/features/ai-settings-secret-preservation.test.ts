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
    firstName: null,
    id: "admin-1",
    lastName: null,
    avatarDataUrl: null,
    role: "ADMIN",
  };
}

function form(values: Record<string, boolean | string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "boolean") {
      if (value) {
        formData.set(key, "on");
      }
      continue;
    }
    formData.set(key, value);
  }
  return formData;
}

const connectionRepository: HelpdeskConnectionsRepository = {
  async clearActiveWorkspaceId() {},
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
      access: {
        canEditAiRephraseStyleOverrides: false,
        canEditMyStyle: true,
        role: "AGENT",
      },
      displayName: "Support",
      id: connectionId,
      workspaceId: connectionId,
      identityVersion: "identity-v1",
      providerIdentityExternalId: "agent-1",
      providerIdentityDisplayName: "Agent One",
      providerKey: "example",
      status: "active",
      updatedAt: new Date("2026-06-01T00:00:00Z"),
      userId,
      workspace: {
        id: connectionId, ownerUserId: userId, providerKey: "example",
        displayName: "Support", baseUrl: "https://helpdesk.example.com",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        updatedAt: new Date("2026-06-01T00:00:00Z"),
      },
    };
  },
  async findForUserWorkspace(userId, workspaceId) {
    return this.findForUser(userId, workspaceId);
  },
  async findWorkspaceForUser(userId, workspaceId) {
    return {
      id: workspaceId, ownerUserId: userId, providerKey: "example",
      displayName: "Support", baseUrl: "https://helpdesk.example.com",
      createdAt: new Date("2026-06-01T00:00:00Z"),
      updatedAt: new Date("2026-06-01T00:00:00Z"),
      access: { canEditAiRephraseStyleOverrides: false, canEditMyStyle: true, role: "AGENT" },
      connection: null,
    };
  },
  async getActiveWorkspaceId() {
    return "connection-1";
  },
  async getAccess() {
    return {
      canEditAiRephraseStyleOverrides: false,
      canEditMyStyle: true,
      role: "AGENT",
    };
  },
  async listForUser() {
    return [];
  },
  async setActiveWorkspaceId() {},
  async createPersonalConnection() { return null; },
  async updatePersonalConnection() { return null; },
  async updateWorkspace() { return null; },
  async updateWorkspaceAgentAiPermissions() {},
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
        workspaceId: input.workspaceId,
        policy: input.policy,
        userPermissions: input.userPermissions,
      };
    },
  };
  return repo;
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
      workspaceId: "connection-1",
      policy: "admin-managed",
      userPermissions: {
        canEditAiRephraseStyleOverrides: false,
        canEditMyStyle: false,
      },
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
      workspaceId: "connection-1",
      policy: "admin-managed",
      userPermissions: {
        canEditAiRephraseStyleOverrides: false,
        canEditMyStyle: false,
      },
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

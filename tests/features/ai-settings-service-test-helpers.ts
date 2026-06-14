import { vi } from "vitest";
import type { AuthUser } from "@/auth/types";
import type {
  HelpdeskConnectionsRepository,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type {
  AiSettingsRepository,
  StoredWorkspaceAiSetting,
} from "@/features/ai/settings-repository";

export const encryptionKey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

export function user(role: AuthUser["role"] = "USER"): AuthUser {
  return {
    displayName: null,
    email: `${role.toLowerCase()}@example.com`,
    firstName: null,
    id: `${role.toLowerCase()}-1`,
    lastName: null,
    avatarDataUrl: null,
    role,
  };
}

export function form(values: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

export const defaultWorkspaceAccess: WorkspaceAccess = {
  canEditAiRephraseStyleOverrides: false,
  canEditMyStyle: true,
  role: "AGENT",
};

export function connectionRepository(
  access: WorkspaceAccess = defaultWorkspaceAccess,
): HelpdeskConnectionsRepository {
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
        access,
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
    async getAccess() {
      return access;
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

export function aiSettingsRepository(): AiSettingsRepository & {
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

export function aiSummaryCache(): AiSummaryCacheRepository {
  return {
    enabled: true,
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicket: vi.fn(async () => undefined),
    invalidateWorkspace: vi.fn(async () => undefined),
    readSummary: vi.fn(async () => ({ status: "miss" as const })),
    storeSummary: vi.fn(async () => undefined),
  };
}

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

export function form(values: Record<string, boolean | string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    if (typeof value === "boolean") {
      if (value) {
        formData.set(key, "on");
      }
    } else {
      formData.set(key, value);
    }
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
  const updateWorkspaceAgentAiPermissions = vi.fn(async () => undefined);
  return {
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
        access,
        createdAt: new Date("2026-06-01T00:00:00Z"),
        credential: null,
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
          id: connectionId,
          ownerUserId: userId,
          providerKey: "example",
          displayName: "Support",
          baseUrl: "https://helpdesk.example.com",
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
        id: workspaceId,
        ownerUserId: userId,
        providerKey: "example",
        displayName: "Support",
        baseUrl: "https://helpdesk.example.com",
        createdAt: new Date("2026-06-01T00:00:00Z"),
        updatedAt: new Date("2026-06-01T00:00:00Z"),
        access,
        connection: {
          createdAt: new Date("2026-06-01T00:00:00Z"),
          id: "connection-1",
          identityVersion: "identity-v1",
          providerIdentityDisplayName: "Agent One",
          providerIdentityExternalId: "agent-1",
          status: "active",
          updatedAt: new Date("2026-06-01T00:00:00Z"),
          userId,
          workspaceId,
        },
      };
    },
    async getAccess() {
      return access;
    },
    async getActiveWorkspaceId() {
      return "connection-1";
    },
    async listForUser() {
      return [];
    },
    async setActiveWorkspaceId() {},
    async createPersonalConnection() {
      return null;
    },
    async updatePersonalConnection() {
      return null;
    },
    async updateWorkspace() {
      return null;
    },
    async updateStatus() {
      return false;
    },
    updateWorkspaceAgentAiPermissions,
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
        workspaceId: input.workspaceId,
        policy: input.policy,
        userPermissions: input.userPermissions,
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

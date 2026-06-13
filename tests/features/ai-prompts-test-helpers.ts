import { vi } from "vitest";
import type { AuthUser } from "@/auth/types";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type {
  AiPromptRepository,
  StoredAiPrompt,
  UpsertUserAiPromptOverrideInput,
  UpsertWorkspaceAiPromptInput,
} from "@/features/ai/prompt-repository";
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

export function form(values: Record<string, string | boolean>) {
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

export function connectionRepository(): HelpdeskConnectionsRepository {
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

export function settingsRepository(
  workspaceSetting: StoredWorkspaceAiSetting,
): AiSettingsRepository & { workspaceSetting: StoredWorkspaceAiSetting } {
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
        allowUserPromptOverrides:
          input.allowUserPromptOverrides ??
          repo.workspaceSetting.allowUserPromptOverrides,
        config: input.config ?? null,
        helpdeskConnectionId: input.helpdeskConnectionId,
        policy: input.policy,
      };
    },
  };
  return repo;
}

export function baseWorkspaceSetting(
  allowUserPromptOverrides: boolean,
): StoredWorkspaceAiSetting {
  return {
    allowUserPromptOverrides,
    config: null,
    helpdeskConnectionId: "connection-1",
    policy: "admin-managed",
  };
}

export function promptRepository(): AiPromptRepository & {
  userPrompts: Map<string, StoredAiPrompt>;
  workspacePrompts: Map<string, StoredAiPrompt>;
} {
  const workspacePrompts = new Map<string, StoredAiPrompt>();
  const userPrompts = new Map<string, StoredAiPrompt>();
  const key = (input: { helpdeskConnectionId: string; promptKey: string }) =>
    `${input.helpdeskConnectionId}:${input.promptKey}`;
  const userKey = (input: {
    helpdeskConnectionId: string;
    promptKey: string;
    userId: string;
  }) => `${input.userId}:${input.helpdeskConnectionId}:${input.promptKey}`;
  const record = (
    input: UpsertWorkspaceAiPromptInput | UpsertUserAiPromptOverrideInput,
  ): StoredAiPrompt => ({
    encryptedPrompt: input.encryptedPrompt,
    keyVersion: input.keyVersion,
    promptKey: input.promptKey,
    updatedAt: new Date("2026-06-07T10:00:00Z"),
  });
  return {
    userPrompts,
    workspacePrompts,
    async deleteUserPromptOverride(input) {
      userPrompts.delete(userKey(input));
    },
    async deleteWorkspacePrompt(input) {
      workspacePrompts.delete(key(input));
    },
    async getUserPromptOverride(input) {
      return userPrompts.get(userKey(input)) ?? null;
    },
    async getWorkspacePrompt(input) {
      return workspacePrompts.get(key(input)) ?? null;
    },
    async listUserPromptOverrides(input) {
      return [...userPrompts.entries()]
        .filter(([storedKey]) =>
          storedKey.startsWith(`${input.userId}:${input.helpdeskConnectionId}:`),
        )
        .map(([, prompt]) => prompt);
    },
    async listWorkspacePrompts(helpdeskConnectionId) {
      return [...workspacePrompts.entries()]
        .filter(([storedKey]) => storedKey.startsWith(`${helpdeskConnectionId}:`))
        .map(([, prompt]) => prompt);
    },
    async upsertUserPromptOverride(input) {
      userPrompts.set(userKey(input), record(input));
    },
    async upsertWorkspacePrompt(input) {
      workspacePrompts.set(key(input), record(input));
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

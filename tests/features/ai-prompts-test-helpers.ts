import { vi } from "vitest";
import type { AuthUser } from "@/auth/types";
import type {
  HelpdeskConnectionsRepository,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type {
  AiPromptRepository,
  StoredAiPrompt,
  UpsertWorkspaceAiPromptInput,
} from "@/features/ai/prompt-repository";
import type {
  AiRephraseStyleRepository,
  StoredUserAiRephraseStyleOverride,
  StoredWorkspaceAiRephraseStyle,
  UpsertUserAiRephraseStyleOverrideInput,
  WorkspaceAiRephraseStyleInput,
} from "@/features/ai/rephrase-style-repository";
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
    async updateWorkspaceAgentAiPermissions() {},
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
        config: input.config ?? null,
        helpdeskConnectionId: input.helpdeskConnectionId,
        policy: input.policy,
        userPermissions: input.userPermissions,
      };
    },
  };
  return repo;
}

export function baseWorkspaceSetting(
): StoredWorkspaceAiSetting {
  return {
    config: null,
    helpdeskConnectionId: "connection-1",
    policy: "admin-managed",
    userPermissions: {
      canEditAiRephraseStyleOverrides: false,
      canEditMyStyle: false,
    },
  };
}

export function promptRepository(): AiPromptRepository & {
  workspacePrompts: Map<string, StoredAiPrompt>;
} {
  const workspacePrompts = new Map<string, StoredAiPrompt>();
  const key = (input: { helpdeskConnectionId: string; promptKey: string }) =>
    `${input.helpdeskConnectionId}:${input.promptKey}`;
  const record = (
    input: UpsertWorkspaceAiPromptInput,
  ): StoredAiPrompt => ({
    encryptedPrompt: input.encryptedPrompt,
    keyVersion: input.keyVersion,
    promptKey: input.promptKey,
    updatedAt: new Date("2026-06-07T10:00:00Z"),
  });
  return {
    workspacePrompts,
    async deleteWorkspacePrompt(input) {
      workspacePrompts.delete(key(input));
    },
    async getWorkspacePrompt(input) {
      return workspacePrompts.get(key(input)) ?? null;
    },
    async listWorkspacePrompts(helpdeskConnectionId) {
      return [...workspacePrompts.entries()]
        .filter(([storedKey]) => storedKey.startsWith(`${helpdeskConnectionId}:`))
        .map(([, prompt]) => prompt);
    },
    async upsertWorkspacePrompt(input) {
      workspacePrompts.set(key(input), record(input));
    },
  };
}

export function rephraseStyleRepository(
  seed: StoredWorkspaceAiRephraseStyle[] = [],
): AiRephraseStyleRepository & {
  styles: Map<string, StoredWorkspaceAiRephraseStyle>;
  userOverrides: Map<string, StoredUserAiRephraseStyleOverride>;
} {
  const styles = new Map(seed.map((style) => [style.id, style]));
  const userOverrides = new Map<string, StoredUserAiRephraseStyleOverride>();
  const overrideKey = (input: {
    helpdeskConnectionId: string;
    styleId: string;
    userId: string;
  }) => `${input.userId}:${input.helpdeskConnectionId}:${input.styleId}`;
  const styleFromInput = (
    input: WorkspaceAiRephraseStyleInput,
    id = `style-${styles.size + 1}`,
  ): StoredWorkspaceAiRephraseStyle => ({
    encryptedPrompt: input.encryptedPrompt,
    id,
    isEnabled: true,
    keyVersion: input.keyVersion,
    label: input.label,
    seedKey: null,
    sortOrder: input.sortOrder,
    updatedAt: new Date("2026-06-14T10:00:00Z"),
  });
  const overrideFromInput = (
    input: UpsertUserAiRephraseStyleOverrideInput,
  ): StoredUserAiRephraseStyleOverride => ({
    encryptedPrompt: input.encryptedPrompt,
    keyVersion: input.keyVersion,
    styleId: input.styleId,
    updatedAt: new Date("2026-06-14T10:00:00Z"),
  });
  return {
    styles,
    userOverrides,
    async createWorkspaceStyle(input) {
      const style = styleFromInput(input);
      styles.set(style.id, style);
      return style;
    },
    async deleteUserStyleOverride(input) {
      userOverrides.delete(overrideKey(input));
    },
    async deleteWorkspaceStyle(input) {
      styles.delete(input.styleId);
    },
    async getUserStyleOverride(input) {
      return userOverrides.get(overrideKey(input)) ?? null;
    },
    async getWorkspaceStyle(input) {
      const style = styles.get(input.styleId);
      return style?.id === input.styleId ? style : null;
    },
    async listUserStyleOverrides(input) {
      return [...userOverrides.entries()]
        .filter(([key]) =>
          key.startsWith(`${input.userId}:${input.helpdeskConnectionId}:`),
        )
        .map(([, override]) => override);
    },
    async listWorkspaceStyles(_helpdeskConnectionId) {
      void _helpdeskConnectionId;
      return [...styles.values()]
        .sort((left, right) => left.sortOrder - right.sortOrder);
    },
    async updateWorkspaceStyle(input) {
      const existing = styles.get(input.styleId);
      if (!existing) {
        return null;
      }
      const updated = {
        ...existing,
        encryptedPrompt: input.encryptedPrompt,
        isEnabled: input.isEnabled,
        keyVersion: input.keyVersion,
        label: input.label,
        updatedAt: new Date("2026-06-14T10:00:00Z"),
      };
      styles.set(updated.id, updated);
      return updated;
    },
    async updateWorkspaceStyleOrder(input) {
      input.orderedStyleIds.forEach((styleId, index) => {
        const style = styles.get(styleId);
        if (style) {
          styles.set(styleId, { ...style, sortOrder: (index + 1) * 10 });
        }
      });
    },
    async upsertUserStyleOverride(input) {
      userOverrides.set(overrideKey(input), overrideFromInput(input));
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

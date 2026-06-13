import { describe, expect, it, vi } from "vitest";
import type { AuthUser } from "@/auth/types";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type {
  AiPromptRepository,
  StoredAiPrompt,
  UpsertUserAiPromptOverrideInput,
  UpsertWorkspaceAiPromptInput,
} from "@/features/ai/prompt-repository";
import {
  findAiPromptDefinition,
  ticketSummaryPromptKey,
} from "@/features/ai/prompt-registry";
import type {
  AiSettingsRepository,
  StoredWorkspaceAiSetting,
} from "@/features/ai/settings-repository";
import {
  loadAiPromptCenter,
  resolveEffectiveAiPrompt,
} from "@/features/ai/prompt-service";
import {
  saveAiPromptOverridePolicy,
  saveUserAiPromptOverride,
  saveWorkspaceAiPrompt,
} from "@/features/ai/prompt-mutation-service";

const encryptionKey = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";

function user(role: AuthUser["role"] = "USER"): AuthUser {
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

function form(values: Record<string, string | boolean>) {
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

function settingsRepository(
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

function baseWorkspaceSetting(
  allowUserPromptOverrides: boolean,
): StoredWorkspaceAiSetting {
  return {
    allowUserPromptOverrides,
    config: null,
    helpdeskConnectionId: "connection-1",
    policy: "admin-managed",
  };
}

function promptRepository(): AiPromptRepository & {
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

describe("AI prompts", () => {
  it("registers the summary prompt as admin-only", () => {
    expect(findAiPromptDefinition(ticketSummaryPromptKey)).toMatchObject({
      adminEditable: true,
      userOverridable: false,
    });
  });

  it("stores workspace prompt defaults encrypted and resolves them for summaries", async () => {
    const prompts = promptRepository();
    const settings = settingsRepository(baseWorkspaceSetting(false));
    const cache = aiSummaryCache();

    const result = await saveWorkspaceAiPrompt({
      aiSummaryCacheRepository: cache,
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({
        prompt: "Custom admin summary prompt.",
        promptKey: ticketSummaryPromptKey,
      }),
      promptRepository: prompts,
      settingsRepository: settings,
      user: user("ADMIN"),
    });

    expect(result.ok).toBe(true);
    const stored = [...prompts.workspacePrompts.values()][0];
    expect(stored.encryptedPrompt).not.toBe("Custom admin summary prompt.");
    expect(decryptSecret(stored.encryptedPrompt, encryptionKey))
      .toBe("Custom admin summary prompt.");
    expect(cache.invalidateWorkspace).toHaveBeenCalledWith({
      helpdeskConnectionId: "connection-1",
    });

    await expect(
      resolveEffectiveAiPrompt({
        encryptionKey,
        helpdeskConnectionId: "connection-1",
        promptKey: ticketSummaryPromptKey,
        promptRepository: prompts,
        settingsRepository: settings,
        userId: "user-1",
      }),
    ).resolves.toMatchObject({
      prompt: "Custom admin summary prompt.",
      source: "workspace",
    });
  });

  it("rejects user overrides for the admin-only summary prompt", async () => {
    const result = await saveUserAiPromptOverride({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({
        prompt: "My custom summary prompt.",
        promptKey: ticketSummaryPromptKey,
      }),
      promptRepository: promptRepository(),
      settingsRepository: settingsRepository(baseWorkspaceSetting(true)),
      user: user("USER"),
    });

    expect(result).toMatchObject({
      code: "prompt-not-user-editable",
      ok: false,
    });
  });

  it("preserves but ignores stored user prompts after overrides are disabled", async () => {
    const prompts = promptRepository();
    const settings = settingsRepository(baseWorkspaceSetting(true));
    await prompts.upsertWorkspacePrompt({
      encryptedPrompt: encryptSecret("Admin prompt.", encryptionKey),
      helpdeskConnectionId: "connection-1",
      keyVersion: "v1",
      promptKey: ticketSummaryPromptKey,
    });
    await prompts.upsertUserPromptOverride({
      encryptedPrompt: encryptSecret("Stored user prompt.", encryptionKey),
      helpdeskConnectionId: "connection-1",
      keyVersion: "v1",
      promptKey: ticketSummaryPromptKey,
      userId: "user-1",
    });

    const result = await saveAiPromptOverridePolicy({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({ allowUserPromptOverrides: false }),
      promptRepository: prompts,
      settingsRepository: settings,
      user: user("ADMIN"),
    });

    expect(result.ok).toBe(true);
    expect(settings.workspaceSetting.allowUserPromptOverrides).toBe(false);
    expect(prompts.userPrompts.size).toBe(1);
    await expect(
      resolveEffectiveAiPrompt({
        encryptionKey,
        helpdeskConnectionId: "connection-1",
        promptKey: ticketSummaryPromptKey,
        promptRepository: prompts,
        settingsRepository: settings,
        userId: "user-1",
      }),
    ).resolves.toMatchObject({
      prompt: "Admin prompt.",
      source: "workspace",
    });
  });

  it("hides prompt center from non-admins when no user-editable prompts exist", async () => {
    await expect(
      loadAiPromptCenter({
        connectionRepository: connectionRepository(),
        encryptionKey,
        promptRepository: promptRepository(),
        settingsRepository: settingsRepository(baseWorkspaceSetting(true)),
        user: user("USER"),
      }),
    ).resolves.toMatchObject({
      canView: false,
      userPrompts: [],
    });
  });
});

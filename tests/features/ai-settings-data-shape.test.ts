import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/auth/types";
import type {
  AiSettingsRepository,
  StoredWorkspaceAiSetting,
} from "@/features/ai/settings-repository";
import {
  settingsDataForWorkspace,
  type ActiveWorkspace,
} from "@/features/ai/settings-service";

function user(role: AuthUser["role"]): AuthUser {
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

function repository(
  workspaceSetting: StoredWorkspaceAiSetting | null,
): AiSettingsRepository {
  return {
    async deleteUserSettingsForWorkspace() {},
    async getUserSetting() {
      return null;
    },
    async getWorkspaceSetting() {
      return workspaceSetting;
    },
    async upsertUserSetting() {},
    async upsertWorkspaceSetting() {},
  };
}

function workspace(
  role: ActiveWorkspace["access"]["role"] = "AGENT",
): ActiveWorkspace {
  return {
    access: {
      canEditAiRephraseStyleOverrides: false,
      canEditMyStyle: true,
      role,
    },
    id: "connection-1",
    label: "Support",
  };
}

const configuredWorkspace: StoredWorkspaceAiSetting = {
  config: {
    baseUrl: "https://api.openai.test/v1",
    encryptedApiKey: "encrypted-key",
    keyVersion: "v1",
    model: "support-model",
    providerProtocol: "openai-compatible",
  },
  workspaceId: "connection-1",
  policy: "admin-managed",
  userPermissions: {
    canEditAiRephraseStyleOverrides: true,
    canEditMyStyle: true,
  },
};

describe("workspace AI settings data shape", () => {
  it("returns full workspace config metadata to admins", async () => {
    await expect(
      settingsDataForWorkspace(
        repository(configuredWorkspace),
        user("ADMIN"),
        workspace(),
      ),
    ).resolves.toMatchObject({
      canManageWorkspace: true,
      workspaceConfig: {
        baseUrl: "https://api.openai.test/v1",
        hasApiKey: true,
        model: "support-model",
        providerProtocol: "openai-compatible",
      },
      workspaceConfigConfigured: true,
      userPermissions: {
        canEditAiRephraseStyleOverrides: true,
        canEditMyStyle: true,
      },
    });
  });

  it("hides admin-managed workspace config metadata from non-admins", async () => {
    await expect(
      settingsDataForWorkspace(
        repository(configuredWorkspace),
        user("USER"),
        workspace(),
      ),
    ).resolves.toMatchObject({
      canManageWorkspace: false,
      policy: "admin-managed",
      workspaceConfig: null,
      workspaceConfigConfigured: true,
    });
  });

  it("reports missing admin-managed config without exposing metadata", async () => {
    await expect(
      settingsDataForWorkspace(
        repository({
          config: null,
          workspaceId: "connection-1",
          policy: "admin-managed",
          userPermissions: {
            canEditAiRephraseStyleOverrides: false,
            canEditMyStyle: false,
          },
        }),
        user("USER"),
        workspace(),
      ),
    ).resolves.toMatchObject({
      workspaceConfig: null,
      workspaceConfigConfigured: false,
    });
  });
});

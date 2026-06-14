import { describe, expect, it } from "vitest";
import { encryptSecret } from "@/security/encryption";
import {
  saveUserAiRephraseStyleOverride,
  saveWorkspaceAiRephraseStyle,
} from "@/features/ai/prompt-mutation-service";
import { loadAiPromptCenter } from "@/features/ai/prompt-service";
import { resolveEffectiveAiRephraseStyle } from "@/features/ai/rephrase-style-service";
import {
  aiSummaryCache,
  baseWorkspaceSetting,
  connectionRepository,
  encryptionKey,
  form,
  promptRepository,
  rephraseStyleRepository,
  settingsRepository,
  user,
} from "./ai-prompts-test-helpers";

const editableAccess = {
  canEditAiRephraseStyleOverrides: true,
  canEditMyStyle: true,
  role: "AGENT" as const,
};

const style = {
  encryptedPrompt: encryptSecret("Use a professional tone.", encryptionKey),
  id: "style-professional",
  isEnabled: true,
  keyVersion: "v1",
  label: "Professional",
  seedKey: null,
  sortOrder: 10,
  updatedAt: new Date("2026-06-14T10:00:00Z"),
};

describe("AI rephrase style overrides", () => {
  it("rejects user style overrides without workspace permission", async () => {
    const result = await saveUserAiRephraseStyleOverride({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({
        prompt: "Make this direct and brief.",
        styleId: style.id,
      }),
      promptRepository: promptRepository(),
      rephraseStyleRepository: rephraseStyleRepository([style]),
      settingsRepository: settingsRepository(baseWorkspaceSetting()),
      user: user("USER"),
    });

    expect(result).toMatchObject({
      code: "style-not-user-editable",
      ok: false,
    });
  });

  it("shows user style overrides to non-admins when membership permits it", async () => {
    const result = await loadAiPromptCenter({
      connectionRepository: connectionRepository(editableAccess),
      encryptionKey,
      promptRepository: promptRepository(),
      rephraseStyleRepository: rephraseStyleRepository([style]),
      settingsRepository: settingsRepository(baseWorkspaceSetting()),
      user: user("USER"),
    });

    expect(result).toMatchObject({
      adminPrompts: [],
      canManageWorkspace: false,
      canView: true,
      userRephraseStyleOverrides: [
        { id: style.id, label: "Professional" },
      ],
    });
  });

  it("uses a permitted user override as the effective rephrase style prompt", async () => {
    const styles = rephraseStyleRepository([style]);
    const result = await saveUserAiRephraseStyleOverride({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository: connectionRepository(editableAccess),
      encryptionKey,
      formData: form({
        prompt: "Make this concise for technical readers.",
        styleId: style.id,
      }),
      promptRepository: promptRepository(),
      rephraseStyleRepository: styles,
      settingsRepository: settingsRepository(baseWorkspaceSetting()),
      user: user("USER"),
    });

    expect(result.ok).toBe(true);
    await expect(
      resolveEffectiveAiRephraseStyle({
        encryptionKey,
        helpdeskConnectionId: "connection-1",
        styleId: style.id,
        styleRepository: styles,
        userId: "user-1",
      }),
    ).resolves.toMatchObject({
      prompt: "Make this concise for technical readers.",
      source: "user",
    });
  });

  it("lets admins create workspace rephrase styles", async () => {
    const styles = rephraseStyleRepository([style]);
    const result = await saveWorkspaceAiRephraseStyle({
      aiSummaryCacheRepository: aiSummaryCache(),
      connectionRepository: connectionRepository(),
      encryptionKey,
      formData: form({
        label: "Friendly",
        prompt: "Make the reply friendly and clear.",
      }),
      promptRepository: promptRepository(),
      rephraseStyleRepository: styles,
      settingsRepository: settingsRepository(baseWorkspaceSetting()),
      user: user("ADMIN"),
    });

    expect(result).toMatchObject({
      code: "ai-rephrase-style-created",
      ok: true,
    });
    expect([...styles.styles.values()]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: "Friendly" }),
      ]),
    );
  });
});

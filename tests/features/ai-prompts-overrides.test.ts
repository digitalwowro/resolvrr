import { describe, expect, it } from "vitest";
import { encryptSecret } from "@/security/encryption";
import { ticketSummaryPromptKey } from "@/features/ai/prompt-registry";
import {
  loadAiPromptCenter,
  resolveEffectiveAiPrompt,
} from "@/features/ai/prompt-service";
import {
  saveAiPromptOverridePolicy,
  saveUserAiPromptOverride,
} from "@/features/ai/prompt-mutation-service";
import {
  aiSummaryCache,
  baseWorkspaceSetting,
  connectionRepository,
  encryptionKey,
  form,
  promptRepository,
  settingsRepository,
  user,
} from "./ai-prompts-test-helpers";

describe("AI prompt overrides", () => {
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

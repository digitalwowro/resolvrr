import { describe, expect, it } from "vitest";
import { decryptSecret } from "@/security/encryption";
import {
  findAiPromptDefinition,
  ticketSummaryPromptKey,
} from "@/features/ai/prompt-registry";
import { resolveEffectiveAiPrompt } from "@/features/ai/prompt-service";
import { saveWorkspaceAiPrompt } from "@/features/ai/prompt-mutation-service";
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
});

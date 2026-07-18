import { describe, expect, it } from "vitest";
import { decryptSecret } from "@/security/encryption";
import {
  draftProofreadPromptKey,
  findAiPromptDefinition,
  ticketSummaryPromptKey,
} from "@/features/ai/prompt-registry";
import { resolveEffectiveAiPrompt } from "@/features/ai/prompt-service";
import {
  resetWorkspaceAiPrompt,
  saveWorkspaceAiPrompt,
} from "@/features/ai/prompt-mutation-service";
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

describe("AI prompts", () => {
  it("registers the summary prompt as admin-only", () => {
    expect(findAiPromptDefinition(ticketSummaryPromptKey)).toMatchObject({
      adminEditable: true,
      editor: {
        kind: "supplemental-guidance",
      },
    });
  });

  it("stores workspace prompt defaults encrypted and resolves them for summaries", async () => {
    const prompts = promptRepository();
    const settings = settingsRepository(baseWorkspaceSetting());
    const rephraseStyles = rephraseStyleRepository();
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
      rephraseStyleRepository: rephraseStyles,
      settingsRepository: settings,
      user: user("ADMIN"),
    });

    expect(result.ok).toBe(true);
    const stored = [...prompts.workspacePrompts.values()][0];
    expect(stored.encryptedPrompt).not.toBe("Custom admin summary prompt.");
    expect(decryptSecret(stored.encryptedPrompt, encryptionKey))
      .toBe("Custom admin summary prompt.");
    expect(cache.invalidateWorkspace).toHaveBeenCalledWith({
      workspaceId: "connection-1",
    });

    await expect(
      resolveEffectiveAiPrompt({
        encryptionKey,
        workspaceId: "connection-1",
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

  it("does not invalidate summaries for unrelated draft prompt changes", async () => {
    const prompts = promptRepository();
    const settings = settingsRepository(baseWorkspaceSetting());
    const cache = aiSummaryCache();
    const input = {
      aiSummaryCacheRepository: cache,
      connectionRepository: connectionRepository(),
      encryptionKey,
      promptRepository: prompts,
      rephraseStyleRepository: rephraseStyleRepository(),
      settingsRepository: settings,
      user: user("ADMIN"),
    };

    await saveWorkspaceAiPrompt({
      ...input,
      formData: form({
        prompt: "Keep the draft accurate.",
        promptKey: draftProofreadPromptKey,
      }),
    });
    await resetWorkspaceAiPrompt({
      ...input,
      promptKey: draftProofreadPromptKey,
    });

    expect(cache.invalidateWorkspace).not.toHaveBeenCalled();
  });
});

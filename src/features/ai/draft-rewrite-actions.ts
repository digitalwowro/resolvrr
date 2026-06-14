"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaAiPromptRepository } from "@/data/ai-prompts-repository";
import { prismaAiSettingsRepository } from "@/data/ai-settings-repository";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaMyStyleRepository } from "@/data/my-style-repository";
import {
  draftProofreadPromptKey,
  draftRephrasePromptKey,
} from "./prompt-registry";
import type {
  DraftRewriteRequest,
  DraftRewriteResult,
  RewriteDraftAction,
} from "./draft-rewrite-model";
import { loadMyStyle } from "./my-style-service";
import { resolveEffectiveAiPrompt } from "./prompt-service";
import { activeWorkspace, resolveWorkspaceAiRuntimeConfig } from "./settings-service";
import { rewriteDraftText } from "./draft-rewrite-service";

function invalidDraft(): DraftRewriteResult {
  return {
    reason: "empty-draft",
    retryable: false,
    status: "unavailable",
  };
}

function normalizedRequest(
  request: DraftRewriteRequest,
): DraftRewriteRequest | null {
  if (
    (request.composerMode !== "comment" && request.composerMode !== "reply") ||
    (request.operation !== "proofread" && request.operation !== "rephrase") ||
    typeof request.bodyHtml !== "string"
  ) {
    return null;
  }

  if (
    request.operation === "rephrase" &&
    request.rephraseMode !== "concise" &&
    request.rephraseMode !== "formal" &&
    request.rephraseMode !== "simple" &&
    request.rephraseMode !== "warmer"
  ) {
    return { ...request, rephraseMode: "concise" };
  }

  return request;
}

export const rewriteDraftAction: RewriteDraftAction = async (request) => {
  const normalized = normalizedRequest(request);
  if (!normalized) {
    return invalidDraft();
  }

  const user = await requireCurrentUser();
  const workspace = await activeWorkspace(
    prismaHelpdeskConnectionsRepository,
    user.id,
  );
  if (!workspace) {
    return {
      reason: "no-active-workspace",
      retryable: false,
      status: "unconfigured",
    };
  }

  const [aiConfig, prompt, myStyle] = await Promise.all([
    resolveWorkspaceAiRuntimeConfig(
      prismaAiSettingsRepository,
      env.APP_ENCRYPTION_KEY,
      user.id,
      workspace.id,
    ),
    resolveEffectiveAiPrompt({
      encryptionKey: env.APP_ENCRYPTION_KEY,
      helpdeskConnectionId: workspace.id,
      promptKey:
        normalized.operation === "proofread"
          ? draftProofreadPromptKey
          : draftRephrasePromptKey,
      promptRepository: prismaAiPromptRepository,
      settingsRepository: prismaAiSettingsRepository,
      userId: user.id,
    }),
    loadMyStyle({
      encryptionKey: env.APP_ENCRYPTION_KEY,
      repository: prismaMyStyleRepository,
      userId: user.id,
    }),
  ]);

  return rewriteDraftText({
    aiConfig,
    prompt,
    request: normalized,
    style: myStyle.style,
  });
};

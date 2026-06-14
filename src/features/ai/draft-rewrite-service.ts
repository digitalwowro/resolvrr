import sanitizeHtml from "sanitize-html";
import type { AiRuntimeConfig } from "./provider-config";
import type {
  DraftRephraseMode,
  DraftRewriteOperation,
  DraftRewriteRequest,
  DraftRewriteResult,
} from "./draft-rewrite-model";
import type { MyStyleData } from "./my-style-model";
import type { EffectiveAiPrompt } from "./prompt-service";
import {
  generateAiText,
  type AiTextGenerationRequest,
  type AiTextGenerationResult,
} from "./text-generation";

const maxDraftCharacters = 8_000;

const rephraseModeText: Record<DraftRephraseMode, string> = {
  concise: "Make the draft more concise while preserving meaning.",
  formal: "Make the draft more formal while preserving meaning.",
  simple: "Make the draft simpler and easier to understand while preserving meaning.",
  warmer: "Make the draft warmer while preserving meaning.",
};

function plainTextFromComposerHtml(html: string): string {
  const withBreaks = html
    .replace(/<br\s*\/?>/giu, "\n")
    .replace(/<\/(p|li|div|h[1-6])>/giu, "\n");
  return sanitizeHtml(withBreaks, {
    allowedAttributes: {},
    allowedTags: [],
    disallowedTagsMode: "discard",
  })
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function styleInstructions(style: MyStyleData): string {
  const lines = [
    style.role ? `Role: ${style.role}` : "",
    style.audience ? `Audience: ${style.audience}` : "",
    style.tone ? `Tone: ${style.tone}` : "",
    style.preferences ? `Writing preferences: ${style.preferences}` : "",
    style.constraints ? `Constraints: ${style.constraints}` : "",
  ].filter(Boolean);

  return lines.length > 0
    ? `User My Style guidance:\n${lines.join("\n")}`
    : "User My Style guidance: none provided.";
}

function operationInstruction(
  operation: DraftRewriteOperation,
  rephraseMode: DraftRephraseMode | undefined,
): string {
  if (operation === "proofread") {
    return "Operation: proofread the draft.";
  }
  return `Operation: rephrase the draft. ${
    rephraseModeText[rephraseMode ?? "concise"]
  }`;
}

function userPrompt(input: {
  draftText: string;
  request: DraftRewriteRequest;
  style: MyStyleData;
}): string {
  return [
    operationInstruction(input.request.operation, input.request.rephraseMode),
    `Composer type: ${input.request.composerMode}.`,
    styleInstructions(input.style),
    "Draft text:",
    input.draftText,
  ].join("\n\n");
}

export async function rewriteDraftText(input: {
  aiConfig: AiRuntimeConfig;
  generateText?: typeof generateAiText;
  prompt: Pick<EffectiveAiPrompt, "prompt">;
  request: DraftRewriteRequest;
  style: MyStyleData;
}): Promise<DraftRewriteResult> {
  if (input.aiConfig.status === "unconfigured") {
    return {
      reason: input.aiConfig.reason,
      retryable: false,
      status: "unconfigured",
    };
  }

  const draftText = plainTextFromComposerHtml(input.request.bodyHtml).slice(
    0,
    maxDraftCharacters,
  );
  if (!draftText) {
    return {
      reason: "empty-draft",
      retryable: false,
      status: "unavailable",
    };
  }

  const generator: (
    config: Extract<AiRuntimeConfig, { status: "available" }>,
    request: AiTextGenerationRequest,
  ) => Promise<AiTextGenerationResult> =
    input.generateText ?? generateAiText;

  const result = await generator(input.aiConfig, {
    maxOutputTokens: 800,
    systemInstruction: input.prompt.prompt,
    telemetryOperation:
      input.request.operation === "proofread"
        ? "draft-proofread"
        : "draft-rephrase",
    userPrompt: userPrompt({
      draftText,
      request: input.request,
      style: input.style,
    }),
  });

  if (result.status === "unavailable") {
    return {
      reason: result.reason,
      retryable: result.retryable,
      status: "unavailable",
    };
  }

  return {
    generatedAt: new Date().toISOString(),
    operation: input.request.operation,
    ...(input.request.operation === "rephrase"
      ? { rephraseMode: input.request.rephraseMode ?? "concise" }
      : {}),
    status: "available",
    text: result.text,
  };
}

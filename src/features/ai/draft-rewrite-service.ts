import sanitizeHtml from "sanitize-html";
import type { AiRuntimeConfig } from "./provider-config";
import type {
  DraftRewriteOperation,
  DraftRewriteRequest,
  DraftRewriteResult,
} from "./draft-rewrite-model";
import type { MyStyleData } from "./my-style-model";
import type { EffectiveAiPrompt } from "./prompt-service";
import type { EffectiveAiRephraseStyle } from "./rephrase-style-model";
import {
  generateAiText,
  type AiTextGenerationRequest,
  type AiTextGenerationResult,
} from "./text-generation";

const maxDraftCharacters = 8_000;

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
  rephraseStyle: EffectiveAiRephraseStyle | null,
): string {
  if (operation === "proofread") {
    return "Operation: proofread the draft.";
  }
  return [
    "Operation: rephrase the draft.",
    `Selected style: ${rephraseStyle?.label ?? "Unavailable"}.`,
    "Style instructions:",
    rephraseStyle?.prompt ?? "",
  ].join("\n");
}

function rewriteTargetHtml(request: DraftRewriteRequest): string {
  return request.target.kind === "selection"
    ? request.target.fragmentHtml
    : request.target.bodyHtml;
}

function userPrompt(input: {
  draftText: string;
  rephraseStyle: EffectiveAiRephraseStyle | null;
  request: DraftRewriteRequest;
  style: MyStyleData;
}): string {
  return [
    operationInstruction(input.request.operation, input.rephraseStyle),
    `Composer type: ${input.request.composerMode}.`,
    input.request.target.kind === "selection"
      ? "Rewrite scope: selected text only."
      : "Rewrite scope: complete draft.",
    styleInstructions(input.style),
    "Draft text:",
    input.draftText,
  ].join("\n\n");
}

export async function rewriteDraftText(input: {
  aiConfig: AiRuntimeConfig;
  generateText?: typeof generateAiText;
  prompt: Pick<EffectiveAiPrompt, "prompt">;
  rephraseStyle?: EffectiveAiRephraseStyle | null;
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

  const draftText = plainTextFromComposerHtml(rewriteTargetHtml(input.request)).slice(
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
  if (input.request.operation === "rephrase" && !input.rephraseStyle) {
    return {
      reason: "invalid-rephrase-style",
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
      rephraseStyle: input.rephraseStyle ?? null,
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
      ? {
          rephraseStyle: {
            id: input.rephraseStyle?.id ?? "",
            label: input.rephraseStyle?.label ?? "",
          },
        }
      : {}),
    status: "available",
    text: result.text,
  };
}

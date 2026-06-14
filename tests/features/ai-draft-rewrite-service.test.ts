import { describe, expect, it, vi } from "vitest";
import type { AiRuntimeConfig } from "@/features/ai/provider-config";
import { rewriteDraftText } from "@/features/ai/draft-rewrite-service";
import type { MyStyleData } from "@/features/ai/my-style-model";
import type {
  AiTextGenerationRequest,
  AiTextGenerationResult,
} from "@/features/ai/text-generation";

const availableAiConfig = {
  apiKey: "ai-key",
  baseUrl: "https://ai.example.com/v1",
  model: "model-1",
  provider: "openai-compatible",
  status: "available",
} satisfies Extract<AiRuntimeConfig, { status: "available" }>;

const style = {
  audience: "Technical customers",
  constraints: "Do not promise unsupported timelines.",
  preferences: "Use short paragraphs.",
  role: "Support engineer",
  tone: "Warm and concise",
} satisfies MyStyleData;

type TestGenerateText = (
  config: Extract<AiRuntimeConfig, { status: "available" }>,
  request: AiTextGenerationRequest,
) => Promise<AiTextGenerationResult>;

function generator(
  result: AiTextGenerationResult,
): ReturnType<typeof vi.fn<TestGenerateText>> {
  return vi.fn<TestGenerateText>(async () => result);
}

describe("draft rewrite service", () => {
  it("proofreads composer HTML using draft text and My Style guidance", async () => {
    const generateText = generator({
      status: "available",
      text: "Hello, this is clearer.",
    });

    const result = await rewriteDraftText({
      aiConfig: availableAiConfig,
      generateText,
      prompt: { prompt: "Proofread system prompt." },
      request: {
        bodyHtml: "<p>Hello<br>this is clear.</p><script>bad()</script>",
        composerMode: "reply",
        operation: "proofread",
      },
      style,
    });

    expect(result).toMatchObject({
      operation: "proofread",
      status: "available",
      text: "Hello, this is clearer.",
    });
    expect(generateText).toHaveBeenCalledWith(
      availableAiConfig,
      expect.objectContaining({
        systemInstruction: "Proofread system prompt.",
        telemetryOperation: "draft-proofread",
        userPrompt: expect.stringContaining("Operation: proofread the draft."),
      }),
    );
    const request = generateText.mock.calls[0]?.[1];
    expect(request?.userPrompt).toContain("Composer type: reply.");
    expect(request?.userPrompt).toContain("Role: Support engineer");
    expect(request?.userPrompt).toContain("Audience: Technical customers");
    expect(request?.userPrompt).toContain("Hello\nthis is clear.");
    expect(request?.userPrompt).not.toContain("<script>");
  });

  it("rephrases with the selected workspace style and draft-only input", async () => {
    const generateText = generator({
      status: "available",
      text: "A warmer rewrite.",
    });

    await rewriteDraftText({
      aiConfig: availableAiConfig,
      generateText,
      prompt: { prompt: "Rephrase system prompt." },
      request: {
        bodyHtml: "<p>Please send logs.</p>",
        composerMode: "comment",
        operation: "rephrase",
        rephraseStyleId: "style-friendly",
      },
      rephraseStyle: {
        id: "style-friendly",
        label: "Friendly",
        prompt: "Make the draft warmer and more approachable.",
        source: "workspace",
      },
      style,
    });

    const request = generateText.mock.calls[0]?.[1];
    expect(request).toEqual(
      expect.objectContaining({
        systemInstruction: "Rephrase system prompt.",
        telemetryOperation: "draft-rephrase",
      }),
    );
    expect(request?.userPrompt).toContain("Operation: rephrase the draft.");
    expect(request?.userPrompt).toContain("Selected style: Friendly.");
    expect(request?.userPrompt).toContain("Make the draft warmer");
    expect(request?.userPrompt).toContain("Composer type: comment.");
  });

  it("does not call the AI provider when AI is unconfigured or draft text is empty", async () => {
    const generateText = generator({
      status: "available",
      text: "unused",
    });

    await expect(
      rewriteDraftText({
        aiConfig: { reason: "ai-disabled", status: "unconfigured" },
        generateText,
        prompt: { prompt: "Prompt." },
        request: {
          bodyHtml: "<p>Hello</p>",
          composerMode: "reply",
          operation: "proofread",
        },
        style,
      }),
    ).resolves.toEqual({
      reason: "ai-disabled",
      retryable: false,
      status: "unconfigured",
    });

    await expect(
      rewriteDraftText({
        aiConfig: availableAiConfig,
        generateText,
        prompt: { prompt: "Prompt." },
        request: {
          bodyHtml: "<p> </p>",
          composerMode: "reply",
          operation: "proofread",
        },
        style,
      }),
    ).resolves.toEqual({
      reason: "empty-draft",
      retryable: false,
      status: "unavailable",
    });
    expect(generateText).not.toHaveBeenCalled();
  });

  it("returns provider failures without exposing generated content", async () => {
    const generateText = generator({
      reason: "provider-rate-limited",
      retryable: true,
      status: "unavailable",
    });

    await expect(
      rewriteDraftText({
        aiConfig: availableAiConfig,
        generateText,
        prompt: { prompt: "Prompt." },
        request: {
          bodyHtml: "<p>Hello</p>",
          composerMode: "reply",
          operation: "proofread",
        },
        style,
      }),
    ).resolves.toEqual({
      reason: "provider-rate-limited",
      retryable: true,
      status: "unavailable",
    });
  });
});

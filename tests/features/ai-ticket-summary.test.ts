import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TicketDetail } from "@/core/tickets";
import { summarizeTicketDetail } from "@/features/ai/ticket-summary-service";
import { ticketSummaryPromptContext } from "@/features/ai/ticket-summary-context";
import { generateAiText } from "@/features/ai/text-generation";
import { safeProviderJson } from "@/security/provider-http";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(async (input: string) => ({
    addresses: ["203.0.113.10"],
    canonicalUrl: input.replace(/\/+$/u, ""),
  })),
}));

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

beforeEach(() => {
  vi.clearAllMocks();
});

function ticketDetail(): TicketDetail {
  return {
    links: [],
    measuredAt: new Date("2026-05-24T08:35:00Z"),
    subscription: { supported: false, following: false },
    thread: {
      ticketExternalId: "ticket-1",
      articles: [
        {
          attachments: [],
          author: { name: "Maya Patel", email: "maya@example.com" },
          createdAt: new Date("2026-05-24T08:31:00Z"),
          direction: "inbound",
          externalId: "article-secret-1",
          kind: "message",
          recipients: [],
          sanitizedHtml:
            "<p>Hello <strong>support</strong></p><script>ignored()</script>",
          visibility: "public",
        },
      ],
    },
    ticket: {
      customer: { name: "Maya Patel", email: "maya@example.com" },
      externalId: "ticket-1",
      group: { name: "Users" },
      number: "1001",
      owner: { name: "Agent Smith", email: "agent@example.com" },
      priority: "medium",
      state: "open",
      tags: ["login"],
      title: "Cannot log in",
      updatedAt: new Date("2026-05-24T08:30:00Z"),
    },
  };
}

describe("AI ticket summaries", () => {
  it("keeps AI disabled until provider config is complete", async () => {
    await expect(
      summarizeTicketDetail(
        { status: "unconfigured", reason: "ai-disabled" },
        ticketDetail(),
      ),
    ).resolves.toEqual({
      status: "unconfigured",
      reason: "ai-disabled",
      retryable: false,
    });
  });

  it("builds prompt context from provider-neutral sanitized ticket data", () => {
    const context = ticketSummaryPromptContext(ticketDetail());

    expect(context.prompt).toContain("Ticket: #1001");
    expect(context.prompt).toContain("Hello support");
    expect(context.prompt).not.toContain("<strong>");
    expect(context.prompt).not.toContain("ignored()");
    expect(context.prompt).not.toContain("article-secret-1");
  });

  it("calls OpenAI-compatible chat completions without storing output", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: "Situation: Login issue" } }],
      },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText(
        {
          status: "available",
          apiKey: "openai-key",
          baseUrl: "https://api.openai.test/v1",
          model: "support-model",
          provider: "openai-compatible",
        },
        {
          maxOutputTokens: 80,
          systemInstruction: "Summarize.",
          userPrompt: "Ticket body",
        },
      ),
    ).resolves.toEqual({ status: "available", text: "Situation: Login issue" });

    expect(safeProviderJson).toHaveBeenCalledWith(
      "https://api.openai.test/v1/chat/completions",
      expect.objectContaining({
        allowedAddresses: ["203.0.113.10"],
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer openai-key",
          "Content-Type": "application/json",
        }),
        maxResponseBytes: 256 * 1024,
      }),
    );
  });

  it("maps malformed OpenAI-compatible 2xx responses to temporary failure", async () => {
    vi.mocked(safeProviderJson).mockRejectedValueOnce(new Error("invalid-json"));

    await expect(
      generateAiText(
        {
          status: "available",
          apiKey: "openai-key",
          baseUrl: "https://api.openai.test/v1",
          model: "support-model",
          provider: "openai-compatible",
        },
        {
          maxOutputTokens: 80,
          systemInstruction: "Summarize.",
          userPrompt: "Ticket body",
        },
      ),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });

  it("calls Anthropic-compatible messages with the required API version header", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        content: [{ type: "text", text: "Situation: Login issue" }],
      },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText(
        {
          status: "available",
          apiKey: "anthropic-key",
          baseUrl: "https://api.anthropic.test/v1",
          model: "support-model",
          provider: "anthropic-compatible",
        },
        {
          maxOutputTokens: 80,
          systemInstruction: "Summarize.",
          userPrompt: "Ticket body",
        },
      ),
    ).resolves.toEqual({ status: "available", text: "Situation: Login issue" });

    expect(safeProviderJson).toHaveBeenCalledWith(
      "https://api.anthropic.test/v1/messages",
      expect.objectContaining({
        allowedAddresses: ["203.0.113.10"],
        method: "POST",
        headers: expect.objectContaining({
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
          "x-api-key": "anthropic-key",
        }),
      }),
    );
  });

  it("maps Anthropic-compatible 2xx responses without text to temporary failure", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: { content: [{ type: "image" }] },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      generateAiText(
        {
          status: "available",
          apiKey: "anthropic-key",
          baseUrl: "https://api.anthropic.test/v1",
          model: "support-model",
          provider: "anthropic-compatible",
        },
        {
          maxOutputTokens: 80,
          systemInstruction: "Summarize.",
          userPrompt: "Ticket body",
        },
      ),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });

  it("records selected-ticket summary telemetry without content or provider payloads", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: "Situation: Login issue" } }],
      },
      headers: new Headers(),
      status: 200,
    });

    await expect(
      summarizeTicketDetail(
        {
          status: "available",
          apiKey: "openai-key",
          baseUrl: "https://api.openai.test/v1",
          model: "support-model",
          provider: "openai-compatible",
        },
        ticketDetail(),
      ),
    ).resolves.toMatchObject({ status: "available" });

    const calls = infoSpy.mock.calls.filter(
      ([message]) => message === "AI generation timing",
    );
    expect(calls.length).toBeGreaterThanOrEqual(3);
    expect(calls.map(([, metadata]) => metadata)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          operation: "ticket-summary",
          phase: "prompt-context",
          providerProtocol: "openai-compatible",
          status: "ok",
        }),
        expect.objectContaining({
          operation: "ticket-summary",
          phase: "provider-request",
          providerProtocol: "openai-compatible",
          status: "ok",
        }),
        expect.objectContaining({
          operation: "ticket-summary",
          phase: "total-generation",
          providerProtocol: "openai-compatible",
          status: "ok",
        }),
      ]),
    );

    const logged = JSON.stringify(infoSpy.mock.calls);
    expect(logged).not.toContain("Hello support");
    expect(logged).not.toContain("Situation: Login issue");
    expect(logged).not.toContain("Maya Patel");
    expect(logged).not.toContain("maya@example.com");
    expect(logged).not.toContain("article-secret-1");
    expect(logged).not.toContain("ticket-1");
    expect(logged).not.toContain("1001");
    expect(logged).not.toContain("openai-key");
    expect(logged).not.toContain("support-model");
  });
});

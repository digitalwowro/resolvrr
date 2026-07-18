import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TicketDetail } from "@/core/tickets";
import { summarizeTicketDetail } from "@/features/ai/ticket-summary-service";
import { ticketSummaryPromptContext } from "@/features/ai/ticket-summary-context";
import { safeProviderJson } from "@/security/provider-http";
import {
  ticketSummaryContent,
  ticketSummaryJson,
} from "./ai-ticket-summary-cache-test-helpers";

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
      customer: {
        name: "Maya Patel",
        email: "maya@example.com",
        organization: "Acme Corp",
      },
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
    expect(context.prompt).toContain("Customer organization: Acme Corp");
    expect(context.prompt).toContain("Hello support");
    expect(context.prompt).not.toContain("<strong>");
    expect(context.prompt).not.toContain("ignored()");
    expect(context.prompt).not.toContain("article-secret-1");
  });

  it("keeps the newest bounded articles when long tickets fill the prompt", () => {
    const detail = ticketDetail();
    detail.thread.articles = Array.from({ length: 14 }, (_, index) => ({
      ...detail.thread.articles[0]!,
      createdAt: new Date(`2026-05-${String(index + 1).padStart(2, "0")}T08:31:00Z`),
      externalId: `article-${index + 1}`,
      sanitizedHtml: `<p>message-${index + 1} ${"detail ".repeat(400)}</p>`,
    }));

    const context = ticketSummaryPromptContext(detail);

    expect(context.prompt.length).toBeLessThanOrEqual(18_000);
    expect(context.prompt).toContain("Articles included: 12 of 14");
    expect(context.prompt).not.toContain("message-1 ");
    expect(context.prompt).not.toContain("message-2 ");
    expect(context.prompt).toContain("message-14 ");
  });

  it("repairs one invalid summary response before accepting structured output", async () => {
    vi.mocked(safeProviderJson)
      .mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: "Situation: Login issue" } }],
        },
        headers: new Headers(),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: ticketSummaryJson("Login issue") } }],
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
    ).resolves.toMatchObject({
      status: "available",
      summary: ticketSummaryContent("Login issue"),
    });

    expect(safeProviderJson).toHaveBeenCalledTimes(2);
    const firstBody = JSON.parse(
      String(vi.mocked(safeProviderJson).mock.calls[0]?.[1].body),
    );
    const secondBody = JSON.parse(
      String(vi.mocked(safeProviderJson).mock.calls[1]?.[1].body),
    );
    expect(firstBody.messages[0].content).toContain("ticket-summary-v2");
    expect(secondBody.messages[0].content).toContain(
      "previous response failed structural validation",
    );
  });

  it("fails closed after two invalid summary responses", async () => {
    vi.mocked(safeProviderJson)
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: "invalid" } }] },
        headers: new Headers(),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: '{"still":"invalid"}' } }] },
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
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-invalid-response",
      retryable: true,
    });
  });

  it("records selected-ticket summary telemetry without content or provider payloads", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: ticketSummaryJson("Login issue") } }],
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
    expect(logged).not.toContain("Login issue");
    expect(logged).not.toContain("Maya Patel");
    expect(logged).not.toContain("maya@example.com");
    expect(logged).not.toContain("article-secret-1");
    expect(logged).not.toContain("ticket-1");
    expect(logged).not.toContain("1001");
    expect(logged).not.toContain("openai-key");
    expect(logged).not.toContain("support-model");
  });
});

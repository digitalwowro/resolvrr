import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TicketDetail } from "@/core/tickets";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import { summarizeTicketDetail } from "@/features/ai/ticket-summary-service";
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

function aiCacheRepository(
  overrides: Partial<AiSummaryCacheRepository> = {},
): AiSummaryCacheRepository {
  return {
    enabled: true,
    findFreshSummary: vi.fn(async () => null),
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicket: vi.fn(async () => undefined),
    invalidateWorkspace: vi.fn(async () => undefined),
    storeSummary: vi.fn(async () => undefined),
    ...overrides,
  };
}

const cacheScope = {
  helpdeskConnectionId: "connection-1",
  ticketExternalId: "ticket-1",
  userId: "user-1",
};

const openAiConfig = {
  status: "available" as const,
  apiKey: "openai-key",
  baseUrl: "https://api.openai.test/v1",
  model: "support-model",
  provider: "openai-compatible" as const,
};

describe("AI ticket summary output cache", () => {
  it("reuses a fresh generated summary cache hit without calling the AI provider", async () => {
    const cachedSummary = {
      status: "available" as const,
      generatedAt: "2026-05-24T08:40:00.000Z",
      source: {
        articleCount: 1,
        ticketNumber: "#1001",
        ticketUpdatedAt: "2026-05-24T08:30:00.000Z",
      },
      summary: "Situation: Cached summary",
    };
    const cache = aiCacheRepository({
      findFreshSummary: vi.fn(async () => cachedSummary),
    });

    await expect(
      summarizeTicketDetail(openAiConfig, ticketDetail(), {
        cacheRepository: cache,
        encryptionKey: "test encryption key long enough",
        scope: cacheScope,
      }),
    ).resolves.toEqual(cachedSummary);

    expect(safeProviderJson).not.toHaveBeenCalled();
    expect(cache.findFreshSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptionKey: "test encryption key long enough",
        helpdeskConnectionId: "connection-1",
        operation: "ticket-summary",
        providerProtocol: "openai-compatible",
        ticketExternalId: "ticket-1",
        userId: "user-1",
      }),
    );
    expect(cache.storeSummary).not.toHaveBeenCalled();
  });

  it("stores successful generated summaries without storing prompts", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: "Situation: Fresh summary" } }],
      },
      headers: new Headers(),
      status: 200,
    });
    const cache = aiCacheRepository();

    await expect(
      summarizeTicketDetail(openAiConfig, ticketDetail(), {
        cacheRepository: cache,
        encryptionKey: "test encryption key long enough",
        scope: cacheScope,
      }),
    ).resolves.toMatchObject({
      status: "available",
      summary: "Situation: Fresh summary",
    });

    expect(cache.storeSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptionKey: "test encryption key long enough",
        helpdeskConnectionId: "connection-1",
        modelFingerprint: expect.any(String),
        promptVersion: "ticket-summary-prompt-v1",
        providerProtocol: "openai-compatible",
        result: expect.objectContaining({ summary: "Situation: Fresh summary" }),
        sanitizationVersion: "sanitize-html-plain-text-v1",
        sourceFingerprint: expect.any(String),
        ticketExternalId: "ticket-1",
        userId: "user-1",
      }),
    );
    expect(JSON.stringify(vi.mocked(cache.storeSummary).mock.calls))
      .not.toContain("Hello support");
  });
});

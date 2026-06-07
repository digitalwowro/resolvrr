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
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicket: vi.fn(async () => undefined),
    invalidateWorkspace: vi.fn(async () => undefined),
    readSummary: vi.fn(async () => ({ status: "miss" as const })),
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
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
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
      readSummary: vi.fn(async () => ({
        ageBucket: "lt-1m",
        result: cachedSummary,
        status: "hit" as const,
      })),
    });

    await expect(
      summarizeTicketDetail(openAiConfig, ticketDetail(), {
        cacheRepository: cache,
        encryptionKey: "test encryption key long enough",
        scope: cacheScope,
      }),
    ).resolves.toEqual(cachedSummary);

    expect(safeProviderJson).not.toHaveBeenCalled();
    expect(infoSpy.mock.calls.map(([, metadata]) => metadata)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cacheDataKind: "ai-summary",
          cacheEvent: "hit",
          freshnessAgeBucket: "lt-1m",
          phase: "summary-cache-read",
          providerProtocol: "openai-compatible",
          status: "ok",
        }),
      ]),
    );
    const logged = JSON.stringify(infoSpy.mock.calls);
    expect(logged).not.toContain("Situation: Cached summary");
    expect(logged).not.toContain("ticket-1");
    expect(logged).not.toContain("1001");
    expect(logged).not.toContain("support-model");
    expect(cache.readSummary).toHaveBeenCalledWith(
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
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
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
    expect(infoSpy.mock.calls.map(([, metadata]) => metadata)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          cacheDataKind: "ai-summary",
          cacheEvent: "miss",
          phase: "summary-cache-read",
          providerProtocol: "openai-compatible",
          status: "unavailable",
        }),
        expect.objectContaining({
          cacheDataKind: "ai-summary",
          cacheEvent: "regeneration-started",
          phase: "summary-cache-regeneration",
          providerProtocol: "openai-compatible",
          status: "ok",
        }),
        expect.objectContaining({
          cacheDataKind: "ai-summary",
          cacheEvent: "regeneration-succeeded",
          phase: "summary-cache-regeneration",
          providerProtocol: "openai-compatible",
          status: "ok",
        }),
        expect.objectContaining({
          cacheDataKind: "ai-summary",
          cacheEvent: "write-succeeded",
          phase: "summary-cache-write",
          providerProtocol: "openai-compatible",
          status: "ok",
        }),
      ]),
    );
    expect(JSON.stringify(vi.mocked(cache.storeSummary).mock.calls))
      .not.toContain("Hello support");
    const logged = JSON.stringify(infoSpy.mock.calls);
    expect(logged).not.toContain("Hello support");
    expect(logged).not.toContain("Situation: Fresh summary");
    expect(logged).not.toContain("ticket-1");
    expect(logged).not.toContain("1001");
    expect(logged).not.toContain("support-model");
  });
});

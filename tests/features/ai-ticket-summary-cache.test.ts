import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readCachedTicketSummary } from "@/features/ai/ticket-summary-cache";
import { summarizeTicketDetail } from "@/features/ai/ticket-summary-service";
import { safeProviderJson } from "@/security/provider-http";
import {
  aiCacheRepository,
  cacheScope,
  openAiConfig,
  ticketDetail,
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
      summary: ticketSummaryContent("Cached summary"),
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
    expect(logged).not.toContain("Cached summary");
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

  it("hydrates an existing summary from cache without generating or writing", async () => {
    const cachedSummary = {
      status: "available" as const,
      generatedAt: "2026-05-24T08:40:00.000Z",
      source: {
        articleCount: 1,
        ticketNumber: "#1001",
        ticketUpdatedAt: "2026-05-24T08:30:00.000Z",
      },
      summary: ticketSummaryContent("Cached summary"),
    };
    const cache = aiCacheRepository({
      readSummary: vi.fn(async () => ({
        ageBucket: "lt-1h",
        result: cachedSummary,
        status: "hit" as const,
      })),
    });

    await expect(
      readCachedTicketSummary(openAiConfig, ticketDetail(), {
        cacheRepository: cache,
        encryptionKey: "test encryption key long enough",
        scope: cacheScope,
      }),
    ).resolves.toEqual(cachedSummary);

    expect(safeProviderJson).not.toHaveBeenCalled();
    expect(cache.readSummary).toHaveBeenCalledOnce();
    expect(cache.storeSummary).not.toHaveBeenCalled();
  });

  it("can expose cache read failures to coordinated hydration", async () => {
    const cacheError = new Error("cache unavailable");
    const cache = aiCacheRepository({
      readSummary: vi.fn(async () => {
        throw cacheError;
      }),
    });

    await expect(
      readCachedTicketSummary(openAiConfig, ticketDetail(), {
        cacheRepository: cache,
        encryptionKey: "test encryption key long enough",
        throwOnReadError: true,
        scope: cacheScope,
      }),
    ).rejects.toBe(cacheError);

    expect(safeProviderJson).not.toHaveBeenCalled();
    expect(cache.storeSummary).not.toHaveBeenCalled();
  });

  it("force refreshes by bypassing a valid cache hit and storing the new summary", async () => {
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: ticketSummaryJson("Regenerated summary") } }],
      },
      headers: new Headers(),
      status: 200,
    });
    const cache = aiCacheRepository({
      readSummary: vi.fn(async () => ({
        ageBucket: "lt-1m",
        result: {
          status: "available" as const,
          generatedAt: "2026-05-24T08:40:00.000Z",
          source: {
            articleCount: 1,
            ticketNumber: "#1001",
            ticketUpdatedAt: "2026-05-24T08:30:00.000Z",
          },
          summary: ticketSummaryContent("Cached summary"),
        },
        status: "hit" as const,
      })),
    });

    await expect(
      summarizeTicketDetail(
        openAiConfig,
        ticketDetail(),
        {
          cacheRepository: cache,
          encryptionKey: "test encryption key long enough",
          scope: cacheScope,
        },
        undefined,
        { forceRefresh: true },
      ),
    ).resolves.toMatchObject({
      status: "available",
      summary: ticketSummaryContent("Regenerated summary"),
    });

    expect(cache.readSummary).not.toHaveBeenCalled();
    expect(safeProviderJson).toHaveBeenCalledOnce();
    expect(cache.storeSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        result: expect.objectContaining({
          summary: ticketSummaryContent("Regenerated summary"),
        }),
      }),
    );
  });

  it("stores successful generated summaries without storing prompts", async () => {
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});
    vi.mocked(safeProviderJson).mockResolvedValueOnce({
      data: {
        choices: [{ message: { content: ticketSummaryJson("Fresh summary") } }],
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
      summary: ticketSummaryContent("Fresh summary"),
    });

    expect(cache.storeSummary).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptionKey: "test encryption key long enough",
        helpdeskConnectionId: "connection-1",
        modelFingerprint: expect.any(String),
        promptVersion: "ticket-summary-prompt-v2",
        providerProtocol: "openai-compatible",
        result: expect.objectContaining({
          summary: ticketSummaryContent("Fresh summary"),
        }),
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
    expect(logged).not.toContain("Fresh summary");
    expect(logged).not.toContain("ticket-1");
    expect(logged).not.toContain("1001");
    expect(logged).not.toContain("support-model");
  });

});

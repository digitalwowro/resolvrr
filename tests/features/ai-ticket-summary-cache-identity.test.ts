import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { summarizeTicketDetail } from "@/features/ai/ticket-summary-service";
import { safeProviderJson } from "@/security/provider-http";
import {
  aiCacheRepository,
  cacheScope,
  openAiConfig,
  ticketDetail,
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

describe("AI ticket summary cache identity", () => {
  it("changes summary cache identity when the effective prompt changes", async () => {
    vi.mocked(safeProviderJson)
      .mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: "Situation: First summary" } }],
        },
        headers: new Headers(),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: {
          choices: [{ message: { content: "Situation: Second summary" } }],
        },
        headers: new Headers(),
        status: 200,
      });
    const cache = aiCacheRepository();
    const cacheOptions = {
      cacheRepository: cache,
      encryptionKey: "test encryption key long enough",
      scope: cacheScope,
    };

    await summarizeTicketDetail(
      openAiConfig,
      ticketDetail(),
      cacheOptions,
      { prompt: "First summary prompt.", version: "ticket-summary-prompt-v1" },
    );
    await summarizeTicketDetail(
      openAiConfig,
      ticketDetail(),
      cacheOptions,
      { prompt: "Second summary prompt.", version: "ticket-summary-prompt-v1" },
    );

    const firstKey = vi.mocked(cache.storeSummary).mock.calls[0]?.[0];
    const secondKey = vi.mocked(cache.storeSummary).mock.calls[1]?.[0];
    expect(firstKey?.promptVersion).toBe("ticket-summary-prompt-v1");
    expect(secondKey?.promptVersion).toBe("ticket-summary-prompt-v1");
    expect(firstKey?.sourceFingerprint).not.toBe(secondKey?.sourceFingerprint);
  });
});

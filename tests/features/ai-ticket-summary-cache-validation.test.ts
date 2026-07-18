import { beforeEach, describe, expect, it, vi } from "vitest";
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AI ticket summary cache validation", () => {
  it("does not cache output that fails both validation attempts", async () => {
    vi.mocked(safeProviderJson)
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: "not-json" } }] },
        headers: new Headers(),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { choices: [{ message: { content: '{"invalid":true}' } }] },
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
    ).resolves.toEqual({
      status: "unavailable",
      reason: "provider-invalid-response",
      retryable: true,
    });

    expect(cache.storeSummary).not.toHaveBeenCalled();
  });
});

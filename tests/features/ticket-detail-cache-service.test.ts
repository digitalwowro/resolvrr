import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TicketDetail } from "@/core/tickets";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type { TicketDetailCacheRepository } from "@/features/tickets/cache-repository";
import {
  loadWorkspaceTicketDetail,
  updateWorkspaceTicketMetadata,
} from "@/features/tickets/service";
import { createProviderRegistry } from "@/providers";
import {
  connection,
  encryptionKey,
  mockValidatedBaseUrl,
  provider,
  repository,
} from "./ticket-service-test-helpers";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

function ticketDetail(title: string): TicketDetail {
  return {
    links: [],
    measuredAt: new Date("2026-05-24T08:35:00Z"),
    subscription: { supported: false, following: false },
    thread: { ticketExternalId: "ticket-1", articles: [] },
    ticket: {
      externalId: "ticket-1",
      number: "1",
      tags: [],
      title,
      updatedAt: new Date("2026-05-24T08:30:00Z"),
    },
  };
}

function cacheRepository(
  overrides: Partial<TicketDetailCacheRepository> = {},
): TicketDetailCacheRepository {
  return {
    enabled: true,
    findFreshTicketDetail: vi.fn(async () => null),
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicketDetail: vi.fn(async () => undefined),
    storeTicketDetail: vi.fn(async () => undefined),
    ...overrides,
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

describe("ticket detail persistent cache service integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("uses a fresh selected-ticket detail cache hit without provider detail reads", async () => {
    const getTicketDetail = vi.fn(async () => ticketDetail("Provider detail"));
    const cache = cacheRepository({
      findFreshTicketDetail: vi.fn(async () => ticketDetail("Cached detail")),
    });

    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: "connection-1", connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-1",
      "ticket-1",
      cache,
    );

    expect(result).toMatchObject({
      status: "available",
      detail: { ticket: { title: "Cached detail" } },
    });
    expect(getTicketDetail).not.toHaveBeenCalled();
    expect(cache.findFreshTicketDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        encryptionKey,
        helpdeskConnectionId: "connection-1",
        ticketExternalId: "ticket-1",
        userId: "user-1",
      }),
    );
  });

  it("stores selected-ticket detail after a provider refresh miss", async () => {
    const detail = ticketDetail("Provider detail");
    const cache = cacheRepository();

    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: "connection-1", connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail: async () => detail })]),
      encryptionKey,
      "user-1",
      "ticket-1",
      cache,
    );

    expect(result).toMatchObject({ status: "available" });
    expect(cache.storeTicketDetail).toHaveBeenCalledWith(
      expect.objectContaining({
        detail,
        encryptionKey,
        helpdeskConnectionId: "connection-1",
        ticketExternalId: "ticket-1",
        userId: "user-1",
      }),
    );
  });

  it("bypasses a fresh cache entry for forced provider detail refreshes", async () => {
    const providerDetail = ticketDetail("Provider source detail");
    const getTicketDetail = vi.fn(async () => providerDetail);
    const cache = cacheRepository({
      findFreshTicketDetail: vi.fn(async () => ticketDetail("Cached detail")),
    });

    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: "connection-1", connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-1",
      "ticket-1",
      cache,
      { cacheMode: "bypass" },
    );

    expect(result).toMatchObject({
      status: "available",
      detail: { ticket: { title: "Provider source detail" } },
    });
    expect(cache.findFreshTicketDetail).not.toHaveBeenCalled();
    expect(getTicketDetail).toHaveBeenCalledWith(expect.anything(), "ticket-1");
    expect(cache.storeTicketDetail).toHaveBeenCalledWith(
      expect.objectContaining({ detail: providerDetail }),
    );
  });

  it("invalidates cached detail after confirmed metadata writes", async () => {
    const cache = cacheRepository();
    const aiCache = aiCacheRepository();
    const refreshedDetail = ticketDetail("Refreshed provider detail");

    const result = await updateWorkspaceTicketMetadata(
      repository({ activeConnectionId: "connection-1", connection: connection() }),
      createProviderRegistry([
        provider({
          capabilities: ["ticket:list", "ticket:detail", "ticket:update-priority"],
          getTicketDetail: async () => refreshedDetail,
          updateTicketMetadata: vi.fn(async () => undefined),
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { priority: "high" },
      cache,
      aiCache,
    );

    expect(result).toEqual({ status: "saved" });
    expect(cache.invalidateTicketDetail).toHaveBeenCalledWith({
      helpdeskConnectionId: "connection-1",
      ticketExternalId: "ticket-1",
      userId: "user-1",
    });
    expect(cache.storeTicketDetail).toHaveBeenCalledWith(
      expect.objectContaining({ detail: refreshedDetail }),
    );
    expect(aiCache.invalidateTicket).toHaveBeenCalledWith({
      helpdeskConnectionId: "connection-1",
      ticketExternalId: "ticket-1",
      userId: "user-1",
    });
  });
});

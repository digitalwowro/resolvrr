import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import type { TicketDetailCacheRepository } from "@/features/tickets/cache-repository";
import { loadWorkspaceTicketDetail } from "@/features/tickets";
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

function cacheRepository(): TicketDetailCacheRepository {
  return {
    enabled: true,
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicketDetail: vi.fn(async () => undefined),
    readTicketDetail: vi.fn(async () => ({ status: "miss" as const })),
    storeTicketDetail: vi.fn(async () => undefined),
  };
}

describe("merged ticket detail resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("resolves chains, invalidates sources, and caches only the final ticket", async () => {
    const getTicketDetail = vi.fn(async (context, ticketExternalId: string) => {
      if (ticketExternalId !== "final") {
        return {
          kind: "replaced" as const,
          cause: "merged" as const,
          sourceExternalId: ticketExternalId,
          sourceNumber: ticketExternalId === "source" ? "1001" : "1002",
          targetExternalId: ticketExternalId === "source" ? "middle" : "final",
        };
      }
      return provider().getTicketDetail!(context, ticketExternalId);
    });
    const cache = cacheRepository();
    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: "connection-1", connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-1",
      "source",
      cache,
    );

    expect(result).toMatchObject({
      status: "available",
      detail: { ticket: { externalId: "final" } },
      resolution: {
        sources: [
          { externalId: "source", number: "1001" },
          { externalId: "middle", number: "1002" },
        ],
        targetExternalId: "final",
      },
    });
    expect(cache.invalidateTicketDetail).toHaveBeenCalledTimes(2);
    expect(cache.storeTicketDetail).toHaveBeenCalledOnce();
    expect(cache.storeTicketDetail).toHaveBeenCalledWith(
      expect.objectContaining({ ticketExternalId: "final" }),
    );
  });

  it("fails closed for cycles and inaccessible targets", async () => {
    const cyclic = provider({
      getTicketDetail: async (_context, id) => ({
        kind: "replaced",
        cause: "merged",
        sourceExternalId: id,
        targetExternalId: id === "source" ? "target" : "source",
      }),
    });
    const inaccessible = provider({
      getTicketDetail: async (_context, id) => {
        if (id === "source") {
          return {
            kind: "replaced",
            cause: "merged",
            sourceExternalId: "source",
            targetExternalId: "target",
          };
        }
        throw new ProviderError("permission-denied", "denied");
      },
    });
    const read = (plugin: ReturnType<typeof provider>) =>
      loadWorkspaceTicketDetail(
        repository({ activeConnectionId: "connection-1", connection: connection() }),
        createProviderRegistry([plugin]),
        encryptionKey,
        "user-1",
        "source",
      );

    await expect(read(cyclic)).resolves.toMatchObject({ status: "retired" });
    await expect(read(inaccessible)).resolves.toMatchObject({ status: "retired" });
  });

  it("stops after ten replacement hops", async () => {
    const getTicketDetail = vi.fn(async (_context, id: string) => ({
      kind: "replaced" as const,
      cause: "merged" as const,
      sourceExternalId: id,
      targetExternalId: id === "source" ? "1" : String(Number(id) + 1),
    }));

    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: "connection-1", connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-1",
      "source",
    );

    expect(result).toMatchObject({ status: "retired" });
    expect(getTicketDetail).toHaveBeenCalledTimes(11);
  });
});

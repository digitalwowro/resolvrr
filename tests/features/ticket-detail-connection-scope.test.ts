import { beforeEach, describe, expect, it, vi } from "vitest";
import { noTicketDetailCacheRepository } from "@/features/tickets/cache-repository";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";
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

describe("ticket detail personal-connection scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("uses the explicit connection without consulting active workspace state", async () => {
    const getTicketDetail = vi.fn(async (_context: unknown, ticketExternalId: string) => ({
      links: [],
      measuredAt: new Date("2026-05-24T08:35:00Z"),
      subscription: { supported: false, following: false },
      thread: { ticketExternalId, articles: [] },
      ticket: {
        externalId: ticketExternalId,
        number: "1",
        tags: [],
        title: "Scoped detail",
        updatedAt: new Date("2026-05-24T08:30:00Z"),
      },
    }));

    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: null, connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-1",
      "ticket-1",
      noTicketDetailCacheRepository,
      {
        cacheMode: "bypass",
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-v1",
        workspaceId: "workspace-1",
      },
    );

    expect(result).toMatchObject({
      status: "available",
      helpdeskConnectionId: "connection-1",
      workspaceId: "workspace-1",
    });
    expect(getTicketDetail).toHaveBeenCalledOnce();
  });

  it("rejects a stale identity before reading ticket data", async () => {
    const getTicketDetail = vi.fn();

    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: null, connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-1",
      "ticket-1",
      noTicketDetailCacheRepository,
      {
        cacheMode: "bypass",
        helpdeskConnectionId: "connection-1",
        identityVersion: "identity-v2",
        workspaceId: "workspace-1",
      },
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "no-active-connection",
    });
    expect(getTicketDetail).not.toHaveBeenCalled();
  });

  it("rejects a workspace mismatch before reading ticket data", async () => {
    const getTicketDetail = vi.fn();

    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: null, connection: connection() }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-1",
      "ticket-1",
      noTicketDetailCacheRepository,
      {
        cacheMode: "bypass",
        helpdeskConnectionId: "connection-1",
        workspaceId: "workspace-2",
      },
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "no-active-connection",
    });
    expect(getTicketDetail).not.toHaveBeenCalled();
  });
});

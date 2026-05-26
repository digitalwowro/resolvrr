import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadWorkspaceTicketListPageAction } from "@/features/tickets/list-actions";
import { loadWorkspaceTicketList } from "@/features/tickets/service";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/config/env", () => ({
  env: { APP_ENCRYPTION_KEY: "test-encryption-key" },
}));

vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {},
}));

vi.mock("@/providers", () => ({
  providerRegistry: {},
}));

vi.mock("@/features/tickets/service", () => ({
  loadWorkspaceTicketList: vi.fn(),
}));

const mockedLoadWorkspaceTicketList = vi.mocked(loadWorkspaceTicketList);

describe("loadWorkspaceTicketListPageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("loads the next list page and returns workspace rows only", async () => {
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "available",
      connectionName: "Support",
      metadataMutationCapabilities: { state: false, priority: false },
      tickets: [
        {
          externalId: "ticket-2",
          number: "1002",
          title: "Webhook failed",
          customer: { name: "Maya Patel" },
          owner: { name: "Agent Smith" },
          group: { name: "Users" },
          state: "open",
          priority: "high",
          updatedAt: new Date("2026-05-24T08:30:00Z"),
          tags: [],
        },
      ],
      loadedCount: 1,
      nextCursor: "3",
      measuredAt: new Date("2026-05-24T08:31:30Z"),
    });

    const result = await loadWorkspaceTicketListPageAction(" 2 ");

    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      {},
      {},
      "test-encryption-key",
      "user-1",
      { cursor: "2" },
    );
    expect(result).toMatchObject({
      status: "available",
      loadedCount: 1,
      nextCursor: "3",
      rows: [
        {
          id: "ticket-2",
          number: "#1002",
          title: "Webhook failed",
          customer: "Maya Patel",
          owner: "Agent Smith",
          state: "Open",
          priority: "High",
        },
      ],
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") {
      throw new Error("Expected available list page");
    }
    expect("tickets" in result).toBe(false);
    expect("measuredAt" in result).toBe(false);
  });

  it("passes through unavailable results without provider details", async () => {
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });

    await expect(loadWorkspaceTicketListPageAction("2")).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });
});

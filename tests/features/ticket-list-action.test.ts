import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadWorkspaceTicketListPageAction } from "@/features/tickets/list-actions";
import { loadWorkspaceTicketList } from "@/features/tickets/service";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/config/env", () => ({
  env: { APP_ENCRYPTION_KEY: "unit-test-placeholder" },
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

  it("returns adapted workspace rows for the requested cursor", async () => {
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
          state: "open",
          priority: "high",
          updatedAt: new Date("2026-05-24T08:30:00Z"),
          tags: [],
        },
      ],
      loadedCount: 1,
      nextCursor: "3",
      measuredAt: new Date("2026-05-24T08:31:00Z"),
    });

    const result = await loadWorkspaceTicketListPageAction(" 2 ");

    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      {},
      {},
      "unit-test-placeholder",
      "user-1",
      { cursor: "2" },
    );
    expect(result).toMatchObject({
      status: "available",
      page: {
        rows: [
          {
            id: "ticket-2",
            number: "#1002",
            title: "Webhook failed",
            customer: "Maya Patel",
            owner: "Agent Smith",
          },
        ],
        tabs: [{ id: "ticket-2", number: "#1002", title: "Webhook failed" }],
        loadedCount: 1,
        nextCursor: "3",
      },
    });
  });

  it("passes through unavailable page results without provider details", async () => {
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

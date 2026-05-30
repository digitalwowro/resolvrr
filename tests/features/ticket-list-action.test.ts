import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { loadWorkspaceTicketListPageAction } from "@/features/tickets/list-actions";
import { loadWorkspaceTicketList } from "@/features/tickets/service";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/config/env", () => ({
  env: { APP_ENCRYPTION_KEY: "test-encryption-key" },
}));

vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {
    getActiveConnectionId: vi.fn(),
  },
}));

vi.mock("@/data/saved-views-repository", () => ({
  prismaSavedViewsRepository: {
    findForUser: vi.fn(),
  },
}));

vi.mock("@/providers", () => ({
  providerRegistry: {},
}));

vi.mock("@/features/tickets/service", () => ({
  loadWorkspaceTicketList: vi.fn(),
}));

const mockedLoadWorkspaceTicketList = vi.mocked(loadWorkspaceTicketList);
const mockedGetActiveConnectionId = vi.mocked(
  prismaHelpdeskConnectionsRepository.getActiveConnectionId,
);
const mockedFindSavedView = vi.mocked(prismaSavedViewsRepository.findForUser);

describe("loadWorkspaceTicketListPageAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveConnectionId.mockResolvedValue("connection-1");
    mockedFindSavedView.mockResolvedValue(null);
  });

  it("loads the next list page and returns workspace rows only", async () => {
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "available",
      connectionName: "Support",
      communicationCapabilities: { internalNotes: false },
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

    const result = await loadWorkspaceTicketListPageAction({ cursor: " 2 " });

    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
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

    await expect(loadWorkspaceTicketListPageAction({ cursor: "2" })).resolves.toEqual({
      status: "unavailable",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });

  it("loads a sorted first page with provider-neutral sort input", async () => {
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "available",
      connectionName: "Support",
      communicationCapabilities: { internalNotes: false },
      metadataMutationCapabilities: { state: false, priority: false },
      tickets: [],
      loadedCount: 0,
      measuredAt: new Date("2026-05-24T08:31:30Z"),
    });

    await loadWorkspaceTicketListPageAction({
      sort: { key: "pendingTill", direction: "ascending" },
    });

    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
      {},
      "test-encryption-key",
      "user-1",
      { sort: { key: "pendingUntil", direction: "ascending" } },
    );
  });

  it("returns provider-neutral grouped workspace buckets", async () => {
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "available",
      connectionName: "Support",
      communicationCapabilities: { internalNotes: false },
      metadataMutationCapabilities: { state: false, priority: false },
      tickets: [],
      loadedCount: 1,
      totalCount: 3,
      buckets: [
        {
          key: "priority",
          value: "high",
          label: "High",
          loadedCount: 1,
          totalCount: 3,
          nextCursor: "2",
          tickets: [
            {
              externalId: "ticket-2",
              number: "1002",
              title: "Webhook failed",
              state: "open",
              priority: "high",
              updatedAt: new Date("2026-05-24T08:30:00Z"),
              tags: [],
            },
          ],
        },
      ],
      measuredAt: new Date("2026-05-24T08:31:30Z"),
    });

    const result = await loadWorkspaceTicketListPageAction({ group: "priority" });

    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
      {},
      "test-encryption-key",
      "user-1",
      { count: { includeTotal: true }, group: { key: "priority" } },
    );
    expect(result).toMatchObject({
      status: "available",
      groups: [
        {
          id: "priority-high",
          key: "priority",
          value: "high",
          label: "High",
          loadedCount: 1,
          totalCount: 3,
          nextCursor: "2",
          rows: [{ id: "ticket-2", priority: "High" }],
        },
      ],
    });
  });

  it("loads a specific grouped bucket page with a canonical filter", async () => {
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "available",
      connectionName: "Support",
      communicationCapabilities: { internalNotes: false },
      metadataMutationCapabilities: { state: false, priority: false },
      tickets: [],
      loadedCount: 0,
      measuredAt: new Date("2026-05-24T08:31:30Z"),
    });

    await loadWorkspaceTicketListPageAction({
      bucketValue: "open",
      cursor: "2",
      group: "state",
    });

    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
      {},
      "test-encryption-key",
      "user-1",
      { cursor: "2", filter: { states: ["open"] } },
    );
  });
});

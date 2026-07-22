import { beforeEach, describe, expect, it, vi } from "vitest";
import { requireCurrentUser } from "@/auth/current-user";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { searchWorkspaceTicketsAction } from "@/features/tickets/search-actions";
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
vi.mock("@/providers", () => ({ providerRegistry: {} }));
vi.mock("@/features/tickets/service", () => ({
  loadWorkspaceTicketList: vi.fn(),
}));

const mockedLoad = vi.mocked(loadWorkspaceTicketList);
const mockedCurrentUser = vi.mocked(requireCurrentUser);

function availableResult() {
  return {
    status: "available" as const,
    helpdeskConnectionId: "connection-1",
    workspaceId: "workspace-1",
    connectionName: "Support",
    communicationCapabilities: { customerReplies: false, internalNotes: false },
    metadataMutationCapabilities: { state: false, priority: false },
    tickets: [
      {
        externalId: "42",
        number: "1042",
        title: "Billing question",
        customer: { name: "Customer" },
        owner: { name: "Agent" },
        group: { name: "Support" },
        state: "closed" as const,
        priority: "medium" as const,
        updatedAt: new Date("2026-07-19T10:00:00Z"),
        tags: [],
      },
    ],
    loadedCount: 1,
    totalCount: 31,
    nextCursor: "2",
    measuredAt: new Date("2026-07-19T10:01:00Z"),
  };
}

describe("searchWorkspaceTicketsAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedLoad.mockResolvedValue(availableResult());
  });

  it("runs a quick global search with real totals and no saved-view filter", async () => {
    const result = await searchWorkspaceTicketsAction({
      mode: "quick",
      query: '  title:"billing question"  ',
    });

    expect(mockedLoad).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
      {},
      "test-encryption-key",
      "user-1",
      {
        filter: { searchText: 'title:"billing question"' },
        pageSize: 10,
        count: { includeTotal: true },
        sort: { key: "updatedAt", direction: "descending" },
      },
    );
    expect(result).toMatchObject({
      status: "available",
      loadedCount: 1,
      totalCount: 31,
      nextCursor: "2",
      rows: [{ id: "42", title: "Billing question", state: "Closed" }],
    });
  });

  it("uses provider paging and sorting for detailed results", async () => {
    await searchWorkspaceTicketsAction({
      mode: "detailed",
      query: "billing",
      cursor: " 2 ",
      sort: { key: "title", direction: "ascending" },
    });

    expect(mockedLoad).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
      {},
      "test-encryption-key",
      "user-1",
      {
        filter: { searchText: "billing" },
        pageSize: 100,
        count: { includeTotal: true },
        cursor: "2",
        sort: { key: "title", direction: "ascending" },
      },
    );
  });

  it("rejects invalid input before authentication or provider access", async () => {
    await expect(
      searchWorkspaceTicketsAction({ mode: "quick", query: "bad\nquery" }),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "invalid-search-query",
      retryable: false,
    });
    expect(mockedCurrentUser).not.toHaveBeenCalled();
    expect(mockedLoad).not.toHaveBeenCalled();
  });
});

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

describe("loadWorkspaceTicketListPageAction saved views", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveConnectionId.mockResolvedValue("connection-1");
    mockedFindSavedView.mockResolvedValue(null);
  });

  it("loads a saved view with provider-neutral filter, sort, and provider group", async () => {
    mockedFindSavedView.mockResolvedValueOnce({
      id: "view-1",
      ownerUserId: "user-1",
      helpdeskConnectionId: "connection-1",
      name: "Open priority",
      visibility: "personal",
      filter: { states: ["open"] },
      query: {
        filter: { states: ["open"] },
        group: { key: "priority" },
        sort: { key: "updatedAt", direction: "descending" },
      },
      group: { key: "priority" },
      sort: { key: "updatedAt", direction: "descending" },
      isSystem: false,
      createdAt: new Date("2026-05-24T00:00:00Z"),
      updatedAt: new Date("2026-05-24T00:00:00Z"),
    });
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "available",
      connectionName: "Support",
      communicationCapabilities: { internalNotes: false },
      metadataMutationCapabilities: { state: false, priority: false },
      tickets: [],
      loadedCount: 0,
      measuredAt: new Date("2026-05-24T08:31:30Z"),
    });

    const result = await loadWorkspaceTicketListPageAction({
      savedViewId: "view-1",
    });

    expect(mockedFindSavedView).toHaveBeenCalledWith(
      "user-1",
      "view-1",
      "connection-1",
    );
    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
      {},
      "test-encryption-key",
      "user-1",
      {
        count: { includeTotal: true },
        filter: { states: ["open"] },
        group: { key: "priority" },
        sort: { key: "updatedAt", direction: "descending" },
      },
    );
    expect(result).toMatchObject({
      status: "available",
      appliedGroupBy: "priority",
      appliedSavedViewId: "view-1",
      appliedSort: { key: "updatedAt", direction: "descending" },
    });
  });

  it("applies a global saved view in the active workspace connection", async () => {
    mockedFindSavedView.mockResolvedValueOnce({
      id: "global-view",
      ownerUserId: "user-1",
      name: "Global high priority",
      visibility: "shared",
      filter: { priorities: ["high"] },
      query: { filter: { priorities: ["high"] } },
      isSystem: false,
      createdAt: new Date("2026-05-24T00:00:00Z"),
      updatedAt: new Date("2026-05-24T00:00:00Z"),
    });
    mockedLoadWorkspaceTicketList.mockResolvedValueOnce({
      status: "available",
      connectionName: "Support",
      communicationCapabilities: { internalNotes: false },
      metadataMutationCapabilities: { state: false, priority: false },
      tickets: [],
      loadedCount: 0,
      measuredAt: new Date("2026-05-24T08:31:30Z"),
    });

    const result = await loadWorkspaceTicketListPageAction({
      savedViewId: "global-view",
    });

    expect(mockedFindSavedView).toHaveBeenCalledWith(
      "user-1",
      "global-view",
      "connection-1",
    );
    expect(mockedLoadWorkspaceTicketList).toHaveBeenCalledWith(
      prismaHelpdeskConnectionsRepository,
      {},
      "test-encryption-key",
      "user-1",
      { filter: { priorities: ["high"] } },
    );
    expect(result).toMatchObject({
      status: "available",
      appliedSavedViewId: "global-view",
    });
  });

  it("rejects saved views outside the active workspace connection", async () => {
    mockedFindSavedView.mockResolvedValueOnce(null);

    await expect(
      loadWorkspaceTicketListPageAction({ savedViewId: "other-connection-view" }),
    ).resolves.toMatchObject({
      status: "unavailable",
      reason: "provider-unexpected-response",
      retryable: false,
    });

    expect(mockedFindSavedView).toHaveBeenCalledWith(
      "user-1",
      "other-connection-view",
      "connection-1",
    );
    expect(mockedLoadWorkspaceTicketList).not.toHaveBeenCalled();
  });

  it("rejects saved views when there is no active workspace connection", async () => {
    mockedGetActiveConnectionId.mockResolvedValueOnce(null);

    await expect(
      loadWorkspaceTicketListPageAction({ savedViewId: "view-1" }),
    ).resolves.toMatchObject({
      status: "unavailable",
      reason: "provider-unexpected-response",
      retryable: false,
    });

    expect(mockedFindSavedView).not.toHaveBeenCalled();
    expect(mockedLoadWorkspaceTicketList).not.toHaveBeenCalled();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaWorkspaceTabsRepository } from "@/data/workspace-tabs-repository";
import { saveWorkspaceOpenTabsStateAction } from "@/features/workspace/actions";
import { workspaceOpenTabsStateVersion } from "@/features/workspace/workspace-tab-state";
import { row } from "./ticket-workspace-test-utils";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {
    getActiveConnectionId: vi.fn(),
  },
}));

vi.mock("@/data/workspace-tabs-repository", () => ({
  prismaWorkspaceTabsRepository: {
    setForUser: vi.fn(),
  },
}));

const mockedGetActiveConnectionId = vi.mocked(
  prismaHelpdeskConnectionsRepository.getActiveConnectionId,
);
const mockedSetForUser = vi.mocked(prismaWorkspaceTabsRepository.setForUser);

describe("saveWorkspaceOpenTabsStateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetActiveConnectionId.mockResolvedValue("connection-1");
  });

  it("writes valid workspace tab state for the active connection", async () => {
    await saveWorkspaceOpenTabsStateAction({
      activePane: "ticket-1",
      openTabs: [row],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    });

    expect(mockedSetForUser).toHaveBeenCalledWith(
      "user-1",
      "connection-1",
      expect.objectContaining({
        activePane: "ticket-1",
        openTabs: [expect.objectContaining({ id: "ticket-1" })],
      }),
    );
  });

  it("ignores invalid workspace tab state", async () => {
    await saveWorkspaceOpenTabsStateAction({
      activePane: "ticket-1",
      openTabs: [],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: 0,
    } as never);

    expect(mockedGetActiveConnectionId).not.toHaveBeenCalled();
    expect(mockedSetForUser).not.toHaveBeenCalled();
  });

  it("does not write without an active connection", async () => {
    mockedGetActiveConnectionId.mockResolvedValueOnce(null);

    await saveWorkspaceOpenTabsStateAction({
      activePane: "list",
      openTabs: [],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    });

    expect(mockedSetForUser).not.toHaveBeenCalled();
  });
});

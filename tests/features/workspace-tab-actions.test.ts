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
    findWorkspaceForUser: vi.fn(),
  },
}));

vi.mock("@/data/workspace-tabs-repository", () => ({
  prismaWorkspaceTabsRepository: {
    setForUser: vi.fn(),
  },
}));

const mockedFindWorkspaceForUser = vi.mocked(
  prismaHelpdeskConnectionsRepository.findWorkspaceForUser,
);
const mockedSetForUser = vi.mocked(prismaWorkspaceTabsRepository.setForUser);

describe("saveWorkspaceOpenTabsStateAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedFindWorkspaceForUser.mockResolvedValue({
      id: "workspace-1",
    } as never);
  });

  it("writes valid workspace tab state for the originating workspace", async () => {
    await saveWorkspaceOpenTabsStateAction({
      activePane: "ticket-1",
      openTabs: [row],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    }, "workspace-1");

    expect(mockedSetForUser).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
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
    } as never, "workspace-1");

    expect(mockedFindWorkspaceForUser).not.toHaveBeenCalled();
    expect(mockedSetForUser).not.toHaveBeenCalled();
  });

  it("does not write without access to the originating workspace", async () => {
    mockedFindWorkspaceForUser.mockResolvedValueOnce(null);

    await saveWorkspaceOpenTabsStateAction({
      activePane: "list",
      openTabs: [],
      recentTabs: [],
      tabOrientation: "horizontal",
      updatedAt: "2026-06-02T00:00:00.000Z",
      version: workspaceOpenTabsStateVersion,
    }, "workspace-2");

    expect(mockedSetForUser).not.toHaveBeenCalled();
  });
});

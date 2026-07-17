import { beforeEach, describe, expect, it, vi } from "vitest";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaSavedViewSelectionRepository } from "@/data/saved-view-selection-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { saveWorkspaceSelectedSavedViewAction } from "@/features/saved-views/selection-actions";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));
vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: { getActiveWorkspaceId: vi.fn() },
}));
vi.mock("@/data/saved-view-selection-repository", () => ({
  prismaSavedViewSelectionRepository: { setForUser: vi.fn() },
}));
vi.mock("@/data/saved-views-repository", () => ({
  prismaSavedViewsRepository: { findForUser: vi.fn() },
}));

const getActiveWorkspaceId = vi.mocked(
  prismaHelpdeskConnectionsRepository.getActiveWorkspaceId,
);
const findForUser = vi.mocked(prismaSavedViewsRepository.findForUser);
const setForUser = vi.mocked(prismaSavedViewSelectionRepository.setForUser);

describe("saveWorkspaceSelectedSavedViewAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getActiveWorkspaceId.mockResolvedValue("workspace-1");
  });

  it("persists an accessible selected view for the active workspace", async () => {
    findForUser.mockResolvedValue({ id: "channel" } as never);

    await expect(
      saveWorkspaceSelectedSavedViewAction("channel"),
    ).resolves.toEqual({ status: "saved" });
    expect(findForUser).toHaveBeenCalledWith(
      "user-1",
      "channel",
      "workspace-1",
    );
    expect(setForUser).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      "channel",
    );
  });

  it("persists All tickets without looking up a stored saved view", async () => {
    await expect(
      saveWorkspaceSelectedSavedViewAction("all-tickets"),
    ).resolves.toEqual({ status: "saved" });
    expect(findForUser).not.toHaveBeenCalled();
    expect(setForUser).toHaveBeenCalledWith(
      "user-1",
      "workspace-1",
      "all-tickets",
    );
  });

  it("rejects saved views that are not visible to the current user", async () => {
    findForUser.mockResolvedValue(null);

    await expect(
      saveWorkspaceSelectedSavedViewAction("other-user-view"),
    ).resolves.toEqual({ status: "unavailable" });
    expect(setForUser).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  deleteConnection,
  disableConnection,
} from "@/features/helpdesk-connections/service";
import { connection, repository } from "./helpdesk-connections-service-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("helpdesk connection service lifecycle", () => {
  it("keeps the workspace selected when its personal connection is disabled or deleted", async () => {
    const existing = connection();
    const store = repository([existing]);
    await store.repo.setActiveWorkspaceId("user_1", existing.workspaceId);

    await expect(
      disableConnection(store.repo, "user_1", existing.workspaceId),
    ).resolves.toMatchObject({ ok: true, code: "disabled" });
    expect(store.activeConnectionId).toBe(existing.workspaceId);

    await store.repo.setActiveWorkspaceId("user_1", existing.workspaceId);
    await expect(
      deleteConnection(store.repo, "user_1", existing.workspaceId),
    ).resolves.toMatchObject({ ok: true, code: "deleted" });
    expect(store.activeConnectionId).toBe(existing.workspaceId);
  });
});

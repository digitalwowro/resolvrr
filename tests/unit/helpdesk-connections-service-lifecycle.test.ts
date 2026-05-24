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
  it("clears active selection when disabling or deleting the active connection", async () => {
    const existing = connection();
    const store = repository([existing]);
    await store.repo.setActiveConnectionId("user_1", existing.id);

    await expect(
      disableConnection(store.repo, "user_1", existing.id),
    ).resolves.toMatchObject({ ok: true, code: "disabled" });
    expect(store.activeConnectionId).toBeNull();

    await store.repo.setActiveConnectionId("user_1", existing.id);
    await expect(
      deleteConnection(store.repo, "user_1", existing.id),
    ).resolves.toMatchObject({ ok: true, code: "deleted" });
    expect(store.activeConnectionId).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import {
  deleteManagedSavedView,
  myWorkSavedViewConditions,
  saveManagedSavedView,
} from "@/features/saved-views";
import { repository, storedView } from "./saved-view-management-test-helpers";

describe("saved view management permissions", () => {
  it("prevents deleting the current default view", async () => {
    const { repo } = repository([
      storedView({ id: "view-1", preference: { position: 0, isDefault: true } }),
    ]);

    await expect(
      deleteManagedSavedView(
        repo,
        "user-1",
        "USER",
        "connection-1",
        "view-1",
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "default-delete-blocked",
    });
  });

  it("blocks agent-created shared workspace views", async () => {
    const { repo } = repository();

    await expect(
      saveManagedSavedView(
        repo,
        ["ticket:list"],
        "user-1",
        "USER",
        "connection-1",
        { externalId: "77", label: "Za Mad" },
        {
          name: "Shared queue",
          visibility: "shared",
          colorName: "blue",
          iconName: "briefcase-business",
          conditions: myWorkSavedViewConditions(),
        },
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "permission-denied",
    });
  });
});

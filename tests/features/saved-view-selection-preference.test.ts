import { describe, expect, it } from "vitest";
import {
  workspaceSelectedSavedViewPreferenceFromStorage,
  workspaceSelectedSavedViewPreferenceToStorage,
  workspaceSelectedSavedViewPreferenceVersion,
} from "@/features/saved-views";

describe("workspace selected saved-view preference", () => {
  it("round-trips a selected saved-view id", () => {
    const stored = workspaceSelectedSavedViewPreferenceToStorage("channel");

    expect(workspaceSelectedSavedViewPreferenceFromStorage(stored)).toEqual({
      savedViewId: "channel",
      version: workspaceSelectedSavedViewPreferenceVersion,
    });
  });

  it("rejects malformed and unsupported preference versions", () => {
    expect(
      workspaceSelectedSavedViewPreferenceFromStorage({
        savedViewId: "channel",
        version: 0,
      }),
    ).toBeUndefined();
    expect(
      workspaceSelectedSavedViewPreferenceFromStorage({
        savedViewId: "  ",
        version: workspaceSelectedSavedViewPreferenceVersion,
      }),
    ).toBeUndefined();
  });
});

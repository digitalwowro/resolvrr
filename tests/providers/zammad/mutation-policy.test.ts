import { describe, expect, it } from "vitest";
import {
  zammadMetadataMutationConstraints,
  zammadStateMutationUnavailableReason,
  zammadStateRequiresPendingDate,
} from "@/providers/zammad/mutation-policy";

describe("Zammad ticket metadata mutation policy", () => {
  it("marks new unavailable after a ticket has left the Zammad new state", () => {
    expect(
      zammadStateMutationUnavailableReason({ state: "open" }, "new"),
    ).toContain("return to New");
    expect(
      zammadStateMutationUnavailableReason({ state: "closed" }, "new"),
    ).toContain("return to New");
    expect(
      zammadStateMutationUnavailableReason({ state: "new" }, "new"),
    ).toBeUndefined();
  });

  it("hides new for non-new tickets and marks pending states as date-required", () => {
    const constraints = zammadMetadataMutationConstraints({ state: "open" });

    expect(constraints?.hiddenStates).toEqual(["new"]);
    expect(zammadMetadataMutationConstraints({ state: "new" })?.hiddenStates).toEqual([
      "new",
    ]);
    expect(constraints?.pendingDateRequiredStates).toMatchObject({
      pending_reminder: "Choose a future pending date and time.",
      pending_close: "Choose a future pending date and time.",
    });
  });

  it("identifies Zammad pending states that require pending dates", () => {
    expect(zammadStateRequiresPendingDate("pending_reminder")).toBe(true);
    expect(zammadStateRequiresPendingDate("pending_close")).toBe(true);
    expect(zammadStateRequiresPendingDate("open")).toBe(false);
  });
});

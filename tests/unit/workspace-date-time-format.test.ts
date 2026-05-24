import { describe, expect, it } from "vitest";
import { formatWorkspaceDateTime } from "@/features/tickets";

describe("formatWorkspaceDateTime", () => {
  const now = new Date("2026-05-25T12:00:00Z");

  it("omits the year for dates in the current year and uses 24-hour time", () => {
    expect(
      formatWorkspaceDateTime(new Date("2026-05-27T06:00:00"), { now }),
    ).toBe("May 27, 06:00");
    expect(
      formatWorkspaceDateTime(new Date("2026-05-17T16:49:00"), { now }),
    ).toBe("May 17, 16:49");
  });

  it("includes the year for dates outside the current year", () => {
    expect(
      formatWorkspaceDateTime(new Date("2025-12-31T23:30:00"), { now }),
    ).toBe("Dec 31, 2025, 23:30");
  });
});

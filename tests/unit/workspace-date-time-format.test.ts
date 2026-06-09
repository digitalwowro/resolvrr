import { describe, expect, it } from "vitest";
import {
  formatWorkspaceDateTime,
  formatWorkspaceRelativeTime,
} from "@/features/tickets";

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

  it("returns Unknown for invalid absolute dates", () => {
    expect(formatWorkspaceDateTime(new Date("invalid"), { now })).toBe(
      "Unknown",
    );
  });
});

describe("formatWorkspaceRelativeTime", () => {
  const now = new Date("2026-05-25T12:00:00");

  it("uses now for dates under 60 seconds away", () => {
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-25T11:59:30"), { now }),
    ).toBe("now");
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-25T12:00:30"), { now }),
    ).toBe("now");
  });

  it("uses compact minutes under 60 minutes", () => {
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-25T11:55:00"), { now }),
    ).toBe("5m ago");
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-25T12:15:00"), { now }),
    ).toBe("in 15m");
  });

  it("uses compact hours under 24 hours", () => {
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-25T10:00:00"), { now }),
    ).toBe("2h ago");
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-25T14:00:00"), { now }),
    ).toBe("in 2h");
  });

  it("uses calendar-day labels beyond 24 hours", () => {
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-24T11:59:00"), { now }),
    ).toBe("yesterday");
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-26T12:01:00"), { now }),
    ).toBe("tomorrow");
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-20T12:00:00"), { now }),
    ).toBe("5d ago");
    expect(
      formatWorkspaceRelativeTime(new Date("2026-05-30T12:00:00"), { now }),
    ).toBe("in 5d");
  });

  it("returns Unknown for invalid relative dates", () => {
    expect(formatWorkspaceRelativeTime(new Date("invalid"), { now })).toBe(
      "Unknown",
    );
  });
});

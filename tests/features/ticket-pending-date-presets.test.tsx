import { fireEvent, render, screen } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { localDateValue } from "@/features/workspace/components/ticket-pending-date-time";
import { TicketPendingDateTimeSelector } from "@/features/workspace/components/ticket-pending-date-time-selector";
import { pendingDateForPreset } from "@/features/workspace/components/ticket-pending-date-presets";

afterEach(() => {
  vi.useRealTimers();
});

describe("pending date presets", () => {
  it("uses local calendar days across a daylight-saving boundary", () => {
    const now = new Date(2026, 2, 28, 23, 30);

    expect(localDateValue(pendingDateForPreset("tomorrow", now)))
      .toBe("2026-03-29");
    expect(localDateValue(pendingDateForPreset("one-week", now)))
      .toBe("2026-04-04");
    expect(localDateValue(pendingDateForPreset("two-weeks", now)))
      .toBe("2026-04-11");
  });

  it("clamps a calendar month to the target month's final day", () => {
    expect(
      localDateValue(pendingDateForPreset(
        "one-month",
        new Date(2026, 0, 31, 12),
      )),
    ).toBe("2026-02-28");
    expect(
      localDateValue(pendingDateForPreset(
        "one-month",
        new Date(2028, 0, 31, 12),
      )),
    ).toBe("2028-02-29");
  });

  it("preserves time, keeps the selector open, and follows the preset month", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 31, 12, 0));
    const onChange = vi.fn();

    function Fixture() {
      const anchorRef = useRef<HTMLDivElement | null>(null);
      const [value, setValue] = useState({
        date: "2026-07-31",
        time: "13:25",
      });
      return (
        <>
          <div ref={anchorRef} />
          <TicketPendingDateTimeSelector
            anchorRef={anchorRef}
            stateLabel="Pending Reminder"
            value={value}
            onChange={(next) => {
              onChange(next);
              setValue(next);
            }}
            onClose={vi.fn()}
          />
        </>
      );
    }

    render(<Fixture />);
    fireEvent.click(screen.getByRole("button", { name: "Tomorrow" }));

    expect(onChange).toHaveBeenCalledWith({
      date: "2026-08-01",
      time: "13:25",
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Aug 2026")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tomorrow" }))
      .toHaveAttribute("aria-pressed", "true");
  });
});

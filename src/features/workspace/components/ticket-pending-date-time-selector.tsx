"use client";

import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ClipboardClock,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/components/ui/classnames";
import {
  isFuturePendingDateTime,
  localDateValue,
  pad,
  type PendingDateTimeParts,
} from "./ticket-pending-date-time";
import { TimeColumn } from "./ticket-pending-time-column";
import {
  addPendingMonths,
  clampFuturePendingDateTime,
  isPendingMinuteOption,
  nearestPendingMinuteOption,
  parsePendingLocalDate,
  parsePendingTime,
  pendingDateMonthLabels,
  pendingDateWeekdayLabels,
  pendingMonthGrid,
  pendingMonthLabel,
  pendingTimeHours,
  pendingTimeMinutes,
  startOfPendingDay,
} from "./ticket-pending-date-time-selector-utils";
import { TicketPendingDatePresetRow } from "./ticket-pending-date-preset-row";

type TicketPendingDateTimeSelectorProps = {
  anchorRef: RefObject<HTMLDivElement | null>;
  stateLabel: string;
  value: PendingDateTimeParts;
  onChange(value: PendingDateTimeParts): void;
  onClose(): void;
};

type SelectorPosition = Pick<CSSProperties, "left" | "top">;

export function TicketPendingDateTimeSelector({
  anchorRef,
  stateLabel,
  value,
  onChange,
  onClose,
}: TicketPendingDateTimeSelectorProps) {
  const [visibleMonth, setVisibleMonth] = useState(() =>
    parsePendingLocalDate(value.date),
  );
  const [position, setPosition] = useState<SelectorPosition | null>(null);
  const selectorRef = useRef<HTMLDivElement | null>(null);
  const now = new Date();
  const today = startOfPendingDay(now);
  const selectedDate = parsePendingLocalDate(value.date);
  const selectedDateValue = localDateValue(selectedDate);
  const selectedTime = parsePendingTime(value.time);
  const selectedMinute = isPendingMinuteOption(selectedTime.minute)
    ? selectedTime.minute
    : undefined;
  const previousMonth = addPendingMonths(visibleMonth, -1);
  const previousMonthDisabled =
    new Date(
      previousMonth.getFullYear(),
      previousMonth.getMonth() + 1,
      0,
    ).getTime() < today.getTime();

  useLayoutEffect(() => {
    function updatePosition() {
      if (!anchorRef.current || !selectorRef.current) {
        return;
      }

      const anchorRect = anchorRef.current.getBoundingClientRect();
      const selectorRect = selectorRef.current.getBoundingClientRect();
      const viewportInset = 8;
      const gap = 8;
      const maxLeft = window.innerWidth - selectorRect.width - viewportInset;
      const left = Math.max(
        viewportInset,
        Math.min(anchorRect.right - selectorRect.width, maxLeft),
      );
      const belowTop = anchorRect.bottom + gap;
      const wouldOverflowBottom =
        belowTop + selectorRect.height > window.innerHeight - viewportInset;
      const top = wouldOverflowBottom
        ? Math.max(viewportInset, anchorRect.top - selectorRect.height - gap)
        : belowTop;

      setPosition({ left, top });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [anchorRef]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (
        target instanceof Node &&
        (selectorRef.current?.contains(target) ||
          anchorRef.current?.contains(target))
      ) {
        return;
      }

      onClose();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [anchorRef, onClose]);

  function selectDate(date: Date) {
    onChange(
      clampFuturePendingDateTime({
        ...value,
        date: localDateValue(date),
      }),
    );
  }

  function selectPresetDate(date: Date) {
    setVisibleMonth(date);
    selectDate(date);
  }

  function selectHour(hour: number) {
    onChange(
      clampFuturePendingDateTime({
        ...value,
        time: `${pad(hour)}:${pad(
          selectedMinute ?? nearestPendingMinuteOption(selectedTime.minute),
        )}`,
      }),
    );
  }

  function selectMinute(minute: number) {
    onChange(
      clampFuturePendingDateTime({
        ...value,
        time: `${pad(selectedTime.hour)}:${pad(minute)}`,
      }),
    );
  }

  const selector = (
    <div
      aria-label={`Pending date and time selector for ${stateLabel}`}
      className={cn(
        "fixed z-50 w-fit rounded-md border border-slate-200 bg-white p-3 shadow-lg",
        !position && "opacity-0",
      )}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          onClose();
        }
      }}
      ref={selectorRef}
      role="dialog"
      style={position ?? undefined}
    >
      <div className="flex gap-2">
        <div className="w-54 shrink-0">
          <div className="mb-2 flex h-8 items-center justify-between">
            <button
              aria-label="Previous month"
              className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-300"
              disabled={previousMonthDisabled}
              onClick={() => setVisibleMonth(previousMonth)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </button>
            <div className="text-sm font-semibold text-slate-900">
              {pendingMonthLabel(visibleMonth)}
            </div>
            <button
              aria-label="Next month"
              className="grid size-8 place-items-center rounded-md text-slate-600 hover:bg-slate-100"
              onClick={() => setVisibleMonth(addPendingMonths(visibleMonth, 1))}
              type="button"
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </button>
          </div>
          <div className="mb-1 grid h-7 grid-cols-7 place-items-center gap-1 text-center text-xs text-slate-500">
            {pendingDateWeekdayLabels.map((day, index) => (
              <span key={`${day}-${index}`}>{day}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {pendingMonthGrid(visibleMonth).map((date) => {
              const dateValue = localDateValue(date);
              const outsideMonth = date.getMonth() !== visibleMonth.getMonth();
              const selected = dateValue === selectedDateValue;
              const past = startOfPendingDay(date).getTime() < today.getTime();

              return (
                <button
                  aria-label={`Select ${
                    pendingDateMonthLabels[date.getMonth()]
                  } ${date.getDate()}`}
                  className={cn(
                    "h-7 rounded-md text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                    outsideMonth && "text-slate-400",
                    selected &&
                      "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white",
                  )}
                  disabled={past}
                  key={dateValue}
                  onClick={() => selectDate(date)}
                  type="button"
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>
        </div>
        <TimeColumn
          ariaLabel="hour"
          icon={<CalendarClock aria-hidden="true" className="size-4" />}
          options={pendingTimeHours}
          selectedValue={selectedTime.hour}
          valueLabel={(hour) => pad(hour)}
          isDisabled={(hour) =>
            !pendingTimeMinutes.some((minute) =>
              isFuturePendingDateTime({
                date: value.date,
                time: `${pad(hour)}:${pad(minute)}`,
              }),
            )
          }
          onSelect={selectHour}
          tooltip="Hour"
        />
        <TimeColumn
          ariaLabel="minute"
          icon={<ClipboardClock aria-hidden="true" className="size-4" />}
          options={pendingTimeMinutes}
          selectedValue={selectedMinute}
          valueLabel={(minute) => pad(minute)}
          isDisabled={(minute) =>
            !isFuturePendingDateTime({
              date: value.date,
              time: `${pad(selectedTime.hour)}:${pad(minute)}`,
            })
          }
          onSelect={selectMinute}
          tooltip="Minute"
        />
      </div>
      <TicketPendingDatePresetRow
        now={now}
        selectedDateValue={selectedDateValue}
        onSelect={selectPresetDate}
      />
    </div>
  );

  return createPortal(selector, document.body);
}

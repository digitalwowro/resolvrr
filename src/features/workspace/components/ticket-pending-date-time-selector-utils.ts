import {
  isFuturePendingDateTime,
  localDateValue,
  localTimeValue,
  type PendingDateTimeParts,
} from "./ticket-pending-date-time";

export const pendingDateMonthLabels = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const pendingDateWeekdayLabels = ["M", "T", "W", "T", "F", "S", "S"];
export const pendingTimeHours = Array.from({ length: 24 }, (_, index) => index);
const pendingMinuteStep = 5;
export const pendingTimeMinutes = Array.from(
  { length: 60 / pendingMinuteStep },
  (_, index) => index * pendingMinuteStep,
);

export function parsePendingLocalDate(value: string): Date {
  const [year = "0", month = "1", day = "1"] = value.split("-");
  return new Date(Number(year), Number(month) - 1, Number(day));
}

export function parsePendingTime(value: string) {
  const [hour = "0", minute = "0"] = value.split(":");
  return {
    hour: Number(hour),
    minute: Number(minute),
  };
}

export function startOfPendingDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addPendingMonths(date: Date, amount: number) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

export function pendingDateLabel(value: PendingDateTimeParts) {
  const date = parsePendingLocalDate(value.date);
  const monthLabel = pendingDateMonthLabels[date.getMonth()];

  return monthLabel ? `${monthLabel} ${date.getDate()}` : "Set date";
}

export function firstFuturePendingTimeForDate(
  dateValue: string,
  now = new Date(),
) {
  if (dateValue !== localDateValue(now)) {
    return "08:00";
  }

  const nextMinute = new Date(now);
  const nextStepMinute =
    Math.ceil((nextMinute.getMinutes() + 1) / pendingMinuteStep) *
    pendingMinuteStep;
  nextMinute.setMinutes(nextStepMinute, 0, 0);
  return localTimeValue(nextMinute);
}

export function nearestPendingMinuteOption(minute: number) {
  return Math.min(
    60 - pendingMinuteStep,
    Math.max(0, Math.round(minute / pendingMinuteStep) * pendingMinuteStep),
  );
}

export function isPendingMinuteOption(minute: number) {
  return minute % pendingMinuteStep === 0;
}

export function clampFuturePendingDateTime(
  value: PendingDateTimeParts,
  now = new Date(),
): PendingDateTimeParts {
  if (isFuturePendingDateTime(value, now)) {
    return value;
  }

  return {
    ...value,
    time: firstFuturePendingTimeForDate(value.date, now),
  };
}

export function pendingMonthGrid(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const firstWeekday = (first.getDay() + 6) % 7;
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - firstWeekday);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    return date;
  });
}

export function pendingMonthLabel(month: Date) {
  return `${pendingDateMonthLabels[month.getMonth()]} ${month.getFullYear()}`;
}

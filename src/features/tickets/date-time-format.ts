type WorkspaceDateTimeOptions = {
  now?: Date;
};

const minuteMs = 60 * 1000;
const hourMs = 60 * minuteMs;
const dayMs = 24 * hourMs;

const currentYearFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
});

const otherYearFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  hour: "2-digit",
  hourCycle: "h23",
  minute: "2-digit",
  month: "short",
  year: "numeric",
});

export function formatWorkspaceDateTime(
  date: Date,
  { now = new Date() }: WorkspaceDateTimeOptions = {},
) {
  if (!isValidDate(date) || !isValidDate(now)) {
    return "Unknown";
  }

  const formatter =
    date.getFullYear() === now.getFullYear()
      ? currentYearFormatter
      : otherYearFormatter;

  return formatter.format(date);
}

export function formatWorkspaceRelativeTime(
  date: Date,
  { now = new Date() }: WorkspaceDateTimeOptions = {},
) {
  if (!isValidDate(date) || !isValidDate(now)) {
    return "Unknown";
  }

  const diffMs = date.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);
  const direction = diffMs < 0 ? "past" : "future";

  if (absMs < minuteMs) {
    return "now";
  }

  if (absMs < hourMs) {
    return relativeUnitLabel(wholeUnits(absMs, minuteMs), "m", direction);
  }

  if (absMs < dayMs) {
    return relativeUnitLabel(wholeUnits(absMs, hourMs), "h", direction);
  }

  const days = calendarDayDiff(date, now);
  if (days === -1) {
    return "yesterday";
  }
  if (days === 1) {
    return "tomorrow";
  }

  return relativeUnitLabel(Math.max(1, Math.abs(days)), "d", direction);
}

function isValidDate(date: Date) {
  return Number.isFinite(date.getTime());
}

function wholeUnits(absMs: number, unitMs: number) {
  return Math.max(1, Math.floor(absMs / unitMs));
}

function relativeUnitLabel(
  value: number,
  unit: "m" | "h" | "d",
  direction: "past" | "future",
) {
  return direction === "past" ? `${value}${unit} ago` : `in ${value}${unit}`;
}

function calendarDayDiff(date: Date, now: Date) {
  const dateDay = localDayStart(date).getTime();
  const nowDay = localDayStart(now).getTime();

  return Math.round((dateDay - nowDay) / dayMs);
}

function localDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

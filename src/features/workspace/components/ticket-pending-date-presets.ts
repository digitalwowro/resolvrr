export type PendingDatePresetKey =
  | "tomorrow"
  | "one-week"
  | "two-weeks"
  | "one-month";

export const pendingDatePresets: Array<{
  key: PendingDatePresetKey;
  label: string;
}> = [
  { key: "tomorrow", label: "Tomorrow" },
  { key: "one-week", label: "1 week" },
  { key: "two-weeks", label: "2 weeks" },
  { key: "one-month", label: "1 month" },
];

function addCalendarDays(date: Date, days: number): Date {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );
  result.setDate(result.getDate() + days);
  return result;
}

function addCalendarMonth(date: Date): Date {
  const day = date.getDate();
  const firstOfTargetMonth = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    1,
  );
  const lastTargetDay = new Date(
    firstOfTargetMonth.getFullYear(),
    firstOfTargetMonth.getMonth() + 1,
    0,
  ).getDate();
  firstOfTargetMonth.setDate(Math.min(day, lastTargetDay));
  return firstOfTargetMonth;
}

export function pendingDateForPreset(
  key: PendingDatePresetKey,
  now = new Date(),
): Date {
  switch (key) {
    case "tomorrow":
      return addCalendarDays(now, 1);
    case "one-week":
      return addCalendarDays(now, 7);
    case "two-weeks":
      return addCalendarDays(now, 14);
    case "one-month":
      return addCalendarMonth(now);
  }
}

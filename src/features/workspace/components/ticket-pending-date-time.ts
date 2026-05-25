export type PendingDateTimeParts = {
  date: string;
  time: string;
};

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function localDateValue(date: Date): string {
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
  ].join("");
}

function localTimeValue(date: Date): string {
  return [pad(date.getHours()), ":", pad(date.getMinutes())].join("");
}

export function defaultPendingDateTimeParts(
  now = new Date(),
): PendingDateTimeParts {
  const defaultDate = new Date(now);
  defaultDate.setHours(8, 0, 0, 0);
  if (defaultDate.getTime() <= now.getTime()) {
    defaultDate.setDate(defaultDate.getDate() + 1);
  }

  return {
    date: localDateValue(defaultDate),
    time: "08:00",
  };
}

export function pendingDateTimePartsFromIso(
  value: string | undefined,
): PendingDateTimeParts {
  if (!value) {
    return defaultPendingDateTimeParts();
  }

  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) {
    return defaultPendingDateTimeParts();
  }

  return {
    date: localDateValue(date),
    time: localTimeValue(date),
  };
}

export function minimumPendingDateValue(now = new Date()): string {
  return localDateValue(now);
}

export function pendingDateTimeIso(
  value: PendingDateTimeParts,
): string | undefined {
  if (!value.date || !value.time) {
    return undefined;
  }

  const date = new Date(`${value.date}T${value.time}`);
  return Number.isFinite(date.getTime()) ? date.toISOString() : undefined;
}

export function isFuturePendingDateTime(
  value: PendingDateTimeParts,
  now = new Date(),
): boolean {
  const iso = pendingDateTimeIso(value);
  if (!iso) {
    return false;
  }

  return new Date(iso).getTime() > now.getTime();
}

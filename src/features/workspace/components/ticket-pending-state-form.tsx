"use client";

export type PendingDateTimeParts = {
  date: string;
  time: string;
};

type TicketPendingStateFormProps = {
  disabled?: boolean;
  stateLabel: string;
  value: PendingDateTimeParts;
  onChange(value: PendingDateTimeParts): void;
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

export function TicketPendingStateForm({
  disabled = false,
  stateLabel,
  value,
  onChange,
}: TicketPendingStateFormProps) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50/60 p-2">
      <div className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Pending date for {stateLabel}</span>
          <input
            aria-label={`Pending date for ${stateLabel}`}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            min={minimumPendingDateValue()}
            onChange={(event) =>
              onChange({ ...value, date: event.currentTarget.value })
            }
            type="date"
            value={value.date}
          />
        </label>
        <span className="text-xs text-slate-600">at</span>
        <label className="w-20 shrink-0">
          <span className="sr-only">Pending time for {stateLabel}</span>
          <input
            aria-label={`Pending time for ${stateLabel}`}
            className="h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, time: event.currentTarget.value })
            }
            step={60}
            type="time"
            value={value.time}
          />
        </label>
      </div>
    </div>
  );
}

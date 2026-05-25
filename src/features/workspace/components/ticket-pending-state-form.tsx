"use client";

import { cn } from "@/components/ui/classnames";
import {
  minimumPendingDateValue,
  type PendingDateTimeParts,
} from "./ticket-pending-date-time";

type TicketPendingStateFormProps = {
  dateChanged?: boolean;
  disabled?: boolean;
  stateLabel: string;
  timeChanged?: boolean;
  value: PendingDateTimeParts;
  onChange(value: PendingDateTimeParts): void;
};

const changedInputClass =
  "border-amber-500 bg-amber-50 focus-visible:outline-amber-500";

export function TicketPendingStateForm({
  dateChanged = false,
  disabled = false,
  stateLabel,
  timeChanged = false,
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
            className={cn(
              "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50",
              dateChanged && changedInputClass,
            )}
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
            className={cn(
              "h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50",
              timeChanged && changedInputClass,
            )}
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

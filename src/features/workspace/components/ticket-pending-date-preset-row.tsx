"use client";

import { cn } from "@/components/ui/classnames";
import { localDateValue } from "./ticket-pending-date-time";
import {
  pendingDateForPreset,
  pendingDatePresets,
} from "./ticket-pending-date-presets";

export function TicketPendingDatePresetRow({
  now,
  selectedDateValue,
  onSelect,
}: {
  now: Date;
  selectedDateValue: string;
  onSelect(date: Date): void;
}) {
  return (
    <div
      aria-label="Quick pending dates"
      className="mt-3 grid grid-cols-4 gap-1 border-t border-slate-100 pt-3"
      role="group"
    >
      {pendingDatePresets.map((preset) => {
        const date = pendingDateForPreset(preset.key, now);
        const selected = localDateValue(date) === selectedDateValue;
        return (
          <button
            aria-pressed={selected}
            className={cn(
              "h-7 rounded-md px-2 text-xs font-medium text-slate-600 hover:bg-indigo-50 hover:text-indigo-700",
              selected &&
                "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white",
            )}
            key={preset.key}
            onClick={() => onSelect(date)}
            type="button"
          >
            {preset.label}
          </button>
        );
      })}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/classnames";
import { Tooltip } from "@/components/ui/tooltip";

type TimeColumnProps = {
  ariaLabel: string;
  icon: ReactNode;
  options: number[];
  selectedValue?: number;
  tooltip: string;
  valueLabel(value: number): string;
  isDisabled(value: number): boolean;
  onSelect(value: number): void;
};

export function TimeColumn({
  ariaLabel,
  icon,
  options,
  selectedValue,
  tooltip,
  valueLabel,
  isDisabled,
  onSelect,
}: TimeColumnProps) {
  return (
    <div className="w-9 shrink-0 border-l border-slate-100 pl-2">
      <div
        aria-label={ariaLabel}
        className="mb-2 flex h-8 items-center justify-center text-center text-slate-900"
      >
        <Tooltip content={tooltip} delayMs={150} side="top">
          {icon}
        </Tooltip>
      </div>
      <div className="grid max-h-56 gap-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {options.map((option) => {
          const labelText = valueLabel(option);
          const selected = option === selectedValue;

          return (
            <button
              aria-label={`Select ${ariaLabel} ${labelText}`}
              className={cn(
                "h-7 w-full rounded-md text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:text-slate-300 disabled:hover:bg-transparent",
                selected &&
                  "bg-indigo-600 text-white hover:bg-indigo-600 hover:text-white",
              )}
              disabled={isDisabled(option)}
              key={option}
              onClick={() => onSelect(option)}
              type="button"
            >
              {labelText}
            </button>
          );
        })}
      </div>
    </div>
  );
}

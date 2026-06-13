"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui";

type ProfileNameFieldProps = {
  disabled: boolean;
  label: string;
  name: string;
  onChange(value: string): void;
  placeholder: string;
  tooltip: string;
  value: string;
};

const inputClass =
  "mt-1 h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50";

export function WorkspaceSettingsProfileNameField({
  disabled,
  label,
  name,
  onChange,
  placeholder,
  tooltip,
  value,
}: ProfileNameFieldProps) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      <span className="flex items-center gap-1.5">
        {label}
        <Tooltip content={tooltip} delayMs={150} side="top">
          <span
            aria-label={tooltip}
            className="inline-grid size-4 place-items-center rounded-full text-slate-400 hover:text-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            tabIndex={0}
          >
            <Info aria-hidden="true" className="size-3.5" />
          </span>
        </Tooltip>
      </span>
      <input
        className={inputClass}
        disabled={disabled}
        maxLength={80}
        name={name}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        type="text"
        value={value}
      />
    </label>
  );
}

"use client";

import { Check } from "lucide-react";
import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { cn } from "./classnames";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  helpText?: string;
  error?: string;
  indeterminate?: boolean;
  hideLabel?: boolean;
};

export function Checkbox({
  label,
  helpText,
  error,
  indeterminate = false,
  hideLabel = false,
  className,
  id,
  ...props
}: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const checkboxId = id ?? props.name;
  const helpId = helpText && checkboxId ? `${checkboxId}-help` : undefined;
  const errorId = error && checkboxId ? `${checkboxId}-error` : undefined;

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = indeterminate;
    }
  }, [indeterminate]);

  return (
    <label className={cn("flex items-start gap-2", className)}>
      <span className="relative mt-0.5 inline-grid size-5 place-items-center">
        <input
          ref={inputRef}
          aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
          aria-invalid={error ? true : undefined}
          className="peer size-5 appearance-none rounded-md border-1 border-slate-300 bg-white checked:border-indigo-600 checked:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-50"
          id={checkboxId}
          type="checkbox"
          {...props}
        />
        <Check
          aria-hidden="true"
          className="pointer-events-none absolute size-3 text-white opacity-0 peer-checked:opacity-100"
        />
      </span>
      <span className={cn(hideLabel && "sr-only")}>
        <span className="text-slate-800">{label}</span>
        {helpText ? (
          <span className="block leading-5 text-slate-500" id={helpId}>
            {helpText}
          </span>
        ) : null}
        {error ? (
          <span className="block leading-5 text-rose-700" id={errorId}>
            {error}
          </span>
        ) : null}
      </span>
    </label>
  );
}

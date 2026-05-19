"use client";

import { useEffect, useRef, type InputHTMLAttributes } from "react";
import { cn } from "./classnames";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  helpText?: string;
  error?: string;
  indeterminate?: boolean;
};

export function Checkbox({
  label,
  helpText,
  error,
  indeterminate = false,
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
    <label className={cn("flex items-start gap-2 text-sm", className)}>
      <input
        ref={inputRef}
        aria-describedby={[helpId, errorId].filter(Boolean).join(" ") || undefined}
        aria-invalid={error ? true : undefined}
        className="mt-0.5 size-4 rounded border-slate-300 text-indigo-600 focus:ring-2 focus:ring-indigo-200 disabled:cursor-not-allowed disabled:opacity-50"
        id={checkboxId}
        type="checkbox"
        {...props}
      />
      <span>
        <span className="font-medium text-slate-800">{label}</span>
        {helpText ? (
          <span className="block text-xs leading-5 text-slate-500" id={helpId}>
            {helpText}
          </span>
        ) : null}
        {error ? (
          <span className="block text-xs leading-5 text-rose-700" id={errorId}>
            {error}
          </span>
        ) : null}
      </span>
    </label>
  );
}

"use client";

import type { ReactNode } from "react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";

type ToolbarButtonProps = {
  children: ReactNode;
  active?: boolean;
  className?: string;
  disabled: boolean;
  label: string;
  onClick(): void;
};

export function ToolbarButton({
  children,
  active,
  className,
  disabled,
  label,
  onClick,
}: ToolbarButtonProps) {
  return (
    <Tooltip content={label} delayMs={150} side="bottom">
      <button
        aria-label={label}
        aria-pressed={active ?? undefined}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md hover:bg-slate-200 hover:text-slate-900 active:bg-slate-300 disabled:cursor-not-allowed disabled:opacity-40",
          active
            ? "font-bold text-slate-950 [&_svg]:stroke-[3]"
            : "text-slate-600",
          className,
        )}
        disabled={disabled}
        onClick={onClick}
        onMouseDown={(event) => event.preventDefault()}
        type="button"
      >
        {children}
      </button>
    </Tooltip>
  );
}

"use client";

import { PanelLeft, PanelTop } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";

type WorkspaceControlsProps = {
  className?: string;
  onTabOrientationChange(orientation: "horizontal" | "vertical"): void;
  tabOrientation: "horizontal" | "vertical";
};

export function WorkspaceControls({
  className,
  onTabOrientationChange,
  tabOrientation,
}: WorkspaceControlsProps) {
  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2",
        className,
      )}
    >
      <TabLayoutSwitch
        onChange={onTabOrientationChange}
        value={tabOrientation}
      />
    </div>
  );
}

function TabLayoutSwitch({
  onChange,
  value,
}: {
  onChange(orientation: "horizontal" | "vertical"): void;
  value: "horizontal" | "vertical";
}) {
  return (
    <div
      aria-label="Tab layout"
      className="inline-flex h-8 items-center rounded-md border border-slate-200 bg-white p-0.5"
      role="group"
    >
      <Tooltip content="Horizontal tabs" side="bottom">
        <button
          aria-label="Horizontal tabs"
          aria-pressed={value === "horizontal"}
          className={cn(
            "grid size-7 place-items-center rounded-sm text-slate-600 hover:bg-slate-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600",
            value === "horizontal" && "bg-indigo-50 text-indigo-700",
          )}
          onClick={() => onChange("horizontal")}
          type="button"
        >
          <PanelTop aria-hidden="true" className="size-4" />
        </button>
      </Tooltip>
      <Tooltip content="Vertical tabs" side="bottom">
        <button
          aria-label="Vertical tabs"
          aria-pressed={value === "vertical"}
          className={cn(
            "grid size-7 place-items-center rounded-sm text-slate-600 hover:bg-slate-50",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600",
            value === "vertical" && "bg-indigo-50 text-indigo-700",
          )}
          onClick={() => onChange("vertical")}
          type="button"
        >
          <PanelLeft aria-hidden="true" className="size-4" />
        </button>
      </Tooltip>
    </div>
  );
}

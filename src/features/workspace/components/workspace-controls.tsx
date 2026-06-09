"use client";

import { PanelLeft, PanelTop } from "lucide-react";
import { Tooltip } from "@/components/ui";
import { cn } from "@/components/ui/classnames";

type WorkspaceControlsProps = {
  className?: string;
  onTabOrientationChange(orientation: "horizontal" | "vertical"): void;
  tabOrientation: "horizontal" | "vertical";
  tone?: "dark" | "default";
};

export function WorkspaceControls({
  className,
  onTabOrientationChange,
  tabOrientation,
  tone = "default",
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
        tone={tone}
        value={tabOrientation}
      />
    </div>
  );
}

function TabLayoutSwitch({
  onChange,
  tone,
  value,
}: {
  onChange(orientation: "horizontal" | "vertical"): void;
  tone: "dark" | "default";
  value: "horizontal" | "vertical";
}) {
  const dark = tone === "dark";

  return (
    <div
      aria-label="Tab layout"
      className={cn(
        "inline-flex h-8 items-center rounded-md",
        dark
          ? "gap-1"
          : "border border-slate-200 bg-white p-0.5",
      )}
      role="group"
    >
      <Tooltip content="Horizontal tabs" side="bottom">
        <button
          aria-label="Horizontal tabs"
          aria-pressed={value === "horizontal"}
          className={cn(
            "grid size-8 place-items-center rounded-sm",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
            dark
              ? "text-indigo-200 hover:text-white focus-visible:outline-white"
              : "text-slate-600 hover:bg-slate-50 focus-visible:outline-indigo-600",
            value === "horizontal" &&
              (dark ? "text-white" : "bg-indigo-50 text-indigo-700"),
          )}
          onClick={() => onChange("horizontal")}
          type="button"
        >
          <PanelTop aria-hidden="true" className="size-5" />
        </button>
      </Tooltip>
      <Tooltip content="Vertical tabs" side="bottom">
        <button
          aria-label="Vertical tabs"
          aria-pressed={value === "vertical"}
          className={cn(
            "grid size-8 place-items-center rounded-sm",
            "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1",
            dark
              ? "text-indigo-200 hover:text-white focus-visible:outline-white"
              : "text-slate-600 hover:bg-slate-50 focus-visible:outline-indigo-600",
            value === "vertical" &&
              (dark ? "text-white" : "bg-indigo-50 text-indigo-700"),
          )}
          onClick={() => onChange("vertical")}
          type="button"
        >
          <PanelLeft aria-hidden="true" className="size-5" />
        </button>
      </Tooltip>
    </div>
  );
}

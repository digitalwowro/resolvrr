"use client";

import {
  BriefcaseBusiness,
  CircleDot,
  PanelLeft,
  PanelTop,
  Rows3,
  SignalHigh,
  User,
} from "lucide-react";
import {
  Tooltip,
  ToolbarDropdownSelect,
  ToolbarSearchableDropdown,
  dropdownIconClass,
  type DropdownOption,
} from "@/components/ui";
import { cn } from "@/components/ui/classnames";
import type { WorkspaceTicketGroupKey } from "@/features/tickets/workspace-adapter";

type WorkspaceControlsProps = {
  className?: string;
  groupBy: WorkspaceTicketGroupKey;
  groupOptions: DropdownOption[];
  listControlsEnabled: boolean;
  onGroupByChange(groupBy: WorkspaceTicketGroupKey): void;
  onSavedViewChange(savedViewId: string): void;
  onTabOrientationChange(orientation: "horizontal" | "vertical"): void;
  savedViewOptions: DropdownOption[];
  selectedSavedViewId: string;
  tabOrientation: "horizontal" | "vertical";
};

export function WorkspaceControls({
  className,
  groupBy,
  groupOptions,
  listControlsEnabled,
  onGroupByChange,
  onSavedViewChange,
  onTabOrientationChange,
  savedViewOptions,
  selectedSavedViewId,
  tabOrientation,
}: WorkspaceControlsProps) {
  const savedViewOptionsWithIcon = savedViewOptions.map((option) => ({
    ...option,
    icon:
      option.value === selectedSavedViewId ? (
        <BriefcaseBusiness aria-hidden="true" className={dropdownIconClass} />
      ) : (
        option.icon
      ),
  }));

  return (
    <div
      className={cn(
        "flex min-w-0 shrink-0 items-center gap-2",
        className,
      )}
    >
      <ToolbarSearchableDropdown
        ariaLabel="Saved view"
        disabled={!listControlsEnabled}
        onValueChange={onSavedViewChange}
        options={savedViewOptionsWithIcon}
        searchPlaceholder="Find view"
        value={selectedSavedViewId}
      />
      <ToolbarDropdownSelect
        ariaLabel="Group tickets by"
        disabled={!listControlsEnabled}
        onValueChange={(value) =>
          onGroupByChange(value as WorkspaceTicketGroupKey)
        }
        options={groupOptions.map((option) => ({
          ...option,
          icon:
            option.value === "priority" ? (
              <SignalHigh aria-hidden="true" className={dropdownIconClass} />
            ) : option.value === "state" ? (
              <CircleDot aria-hidden="true" className={dropdownIconClass} />
            ) : option.value === "owner" ? (
              <User aria-hidden="true" className={dropdownIconClass} />
            ) : option.value === "customer" ? (
              <BriefcaseBusiness aria-hidden="true" className={dropdownIconClass} />
            ) : (
              <Rows3 aria-hidden="true" className={dropdownIconClass} />
            ),
        }))}
        value={groupBy}
      />
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

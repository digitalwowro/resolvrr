"use client";

import { Bot, Eye, MessageSquareText, Settings, User } from "lucide-react";
import { cn } from "@/components/ui/classnames";
import type { WorkspaceSettingsSection } from "./workspace-settings-types";

type WorkspaceSettingsNavProps = {
  activeSection: WorkspaceSettingsSection;
  promptCenterAvailable: boolean;
  onSectionChange(section: WorkspaceSettingsSection): void;
};

function sectionButtonClass(active: boolean) {
  return cn(
    "flex h-9 w-full items-center gap-2 rounded-md px-3 text-left text-sm",
    active
      ? "bg-indigo-50 font-semibold text-indigo-700"
      : "text-slate-600 hover:bg-slate-100 hover:text-slate-950",
  );
}

function sectionGroupLabelClass() {
  return "px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400";
}

export function WorkspaceSettingsNav({
  activeSection,
  promptCenterAvailable,
  onSectionChange,
}: WorkspaceSettingsNavProps) {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r border-slate-200 bg-slate-50">
      <nav className="flex-1 space-y-5 p-3 pt-4" aria-label="Settings sections">
        <div className="space-y-1">
          <p className={sectionGroupLabelClass()}>General settings</p>
          <button
            className={sectionButtonClass(activeSection === "profile")}
            onClick={() => onSectionChange("profile")}
            type="button"
          >
            <User aria-hidden="true" className="size-4" />
            My Profile
          </button>
          <button
            className={sectionButtonClass(activeSection === "workspaces")}
            onClick={() => onSectionChange("workspaces")}
            type="button"
          >
            <Settings aria-hidden="true" className="size-4" />
            Workspaces
          </button>
        </div>
        <div className="space-y-1">
          <p className={sectionGroupLabelClass()}>Workspace settings</p>
          <button
            className={sectionButtonClass(activeSection === "views")}
            onClick={() => onSectionChange("views")}
            type="button"
          >
            <Eye aria-hidden="true" className="size-4" />
            Views
          </button>
          <button
            className={sectionButtonClass(activeSection === "ai")}
            onClick={() => onSectionChange("ai")}
            type="button"
          >
            <Bot aria-hidden="true" className="size-4" />
            AI Settings
          </button>
          {promptCenterAvailable ? (
            <button
              className={sectionButtonClass(activeSection === "prompts")}
              onClick={() => onSectionChange("prompts")}
              type="button"
            >
              <MessageSquareText aria-hidden="true" className="size-4" />
              Prompt Center
            </button>
          ) : null}
        </div>
      </nav>
    </aside>
  );
}

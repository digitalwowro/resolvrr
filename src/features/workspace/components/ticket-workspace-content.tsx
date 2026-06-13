"use client";

import type { ReactNode } from "react";
import { cn } from "@/components/ui/classnames";
import type { TicketTabOrientation } from "./ticket-tabs-panel";

type TicketWorkspaceContentProps = {
  listActive: boolean;
  tabOrientation: TicketTabOrientation;
  tabsPanel: ReactNode;
  workArea: ReactNode;
};

export function TicketWorkspaceContent({
  listActive,
  tabOrientation,
  tabsPanel,
  workArea,
}: TicketWorkspaceContentProps) {
  return (
    <section
      className={cn(
        "flex min-h-0 flex-1 overflow-hidden",
        tabOrientation === "horizontal" && "flex-col",
      )}
    >
      {tabOrientation === "vertical" ? tabsPanel : null}
      {tabOrientation === "horizontal" ? (
        <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 pb-2 pt-4">
          {tabsPanel}
        </div>
      ) : null}
      {listActive || tabOrientation === "vertical" ? (
        <div
          key="workspace-content"
          className={cn(
            "flex min-w-0 flex-1 flex-col overflow-hidden",
            tabOrientation === "horizontal" && "px-4",
          )}
        >
          {workArea}
        </div>
      ) : (
        workArea
      )}
    </section>
  );
}

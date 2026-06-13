"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/components/ui/classnames";
import type { SavedViewSettingsView } from "@/features/saved-views/settings-model";
import { ViewIcon } from "./workspace-settings-views-utils";

type ViewsListProps = {
  onMove(view: SavedViewSettingsView, offset: number): void;
  onSelect(view: SavedViewSettingsView): void;
  pending: boolean;
  selectedId?: string;
  views: SavedViewSettingsView[];
};

export function ViewsList({
  onMove,
  onSelect,
  pending,
  selectedId,
  views,
}: ViewsListProps) {
  if (views.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-600">
        No saved views yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {views.map((view, index) => (
        <div
          className={cn(
            "flex w-full items-center gap-2 rounded-md border bg-white p-2 text-sm",
            selectedId === view.id
              ? "border-indigo-300 ring-2 ring-indigo-100"
              : "border-slate-200 hover:border-slate-300",
          )}
          key={view.id}
        >
          <button
            className="flex min-w-0 flex-1 items-center gap-3 rounded px-1 py-1 text-left"
            onClick={() => onSelect(view)}
            type="button"
          >
            <ViewIcon iconName={view.iconName} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900">
                {view.name}
              </span>
              <span className="text-xs text-slate-500">
                {view.visibility === "shared" ? "Shared" : "Personal"}
                {view.isDefault ? " · Default" : ""}
              </span>
            </span>
          </button>
          <span className="flex shrink-0 items-center gap-1">
            <button
              aria-label={`Move ${view.name} up`}
              className="grid size-6 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
              disabled={index === 0 || pending}
              onClick={() => onMove(view, -1)}
              type="button"
            >
              <ArrowUp aria-hidden="true" className="size-3.5" />
            </button>
            <button
              aria-label={`Move ${view.name} down`}
              className="grid size-6 place-items-center rounded text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
              disabled={index === views.length - 1 || pending}
              onClick={() => onMove(view, 1)}
              type="button"
            >
              <ArrowDown aria-hidden="true" className="size-3.5" />
            </button>
          </span>
        </div>
      ))}
    </div>
  );
}

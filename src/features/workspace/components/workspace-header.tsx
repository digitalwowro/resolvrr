"use client";

import {
  Building2,
  Check,
  Keyboard,
  Search,
  Settings,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { MenuDropdown, type MenuDropdownItem } from "@/components/ui";
import type { StaticProfileAction, StaticProfileWorkspace } from "../static-types";

type WorkspaceHeaderProps = {
  userEmail: string;
  workspaces: StaticProfileWorkspace[];
  actions: StaticProfileAction[];
  selectedWorkspaceId: string;
  onWorkspaceChange(workspaceId: string): void;
};

const actionIcon = {
  preferences: Settings,
  shortcuts: Keyboard,
  "manage-workspaces": SlidersHorizontal,
};

export function WorkspaceHeader({
  userEmail,
  workspaces,
  actions,
  selectedWorkspaceId,
  onWorkspaceChange,
}: WorkspaceHeaderProps) {
  const [query, setQuery] = useState("");
  const [logoAvailable, setLogoAvailable] = useState(true);
  const selectedWorkspace = workspaces.find(
    (workspace) => workspace.id === selectedWorkspaceId,
  );

  const items: MenuDropdownItem[] = [
    { type: "heading", id: "user-heading", label: userEmail },
    { type: "separator", id: "user-separator" },
    { type: "heading", id: "workspace-heading", label: "Workspaces" },
    ...workspaces.map<MenuDropdownItem>((workspace) => ({
      id: `workspace-${workspace.id}`,
      label: workspace.label,
      icon:
        workspace.id === selectedWorkspaceId ? (
          <Check aria-hidden="true" className="size-4" />
        ) : (
          <Building2 aria-hidden="true" className="size-4" />
        ),
      onSelect: () => onWorkspaceChange(workspace.id),
    })),
    { type: "separator", id: "profile-separator" },
    ...actions.map<MenuDropdownItem>((action) => {
      const Icon = actionIcon[action.id as keyof typeof actionIcon] ?? Settings;

      return {
        id: `action-${action.id}`,
        label: action.label,
        icon: <Icon aria-hidden="true" className="size-4" />,
        onSelect: () => undefined,
      };
    }),
  ];

  return (
    <header className="flex h-12 items-center gap-3 border-b border-slate-200 bg-white px-3">
      <div className="flex min-w-32 items-center gap-2">
        {logoAvailable ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Static brand assets render as supplied from public/brand. */
          <img
            alt="Resolvrr"
            className="h-7 w-auto shrink-0"
            onError={() => setLogoAvailable(false)}
            src="/brand/resolvrr-logo.svg"
          />
        ) : null}
        <span className="text-sm font-semibold text-slate-950">Resolvrr</span>
      </div>
      <label className="flex h-8 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 text-sm text-slate-500 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">Search workspace</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tickets, customers, owners"
          type="search"
          value={query}
        />
      </label>
      <MenuDropdown
        align="end"
        items={items}
        triggerClassName="h-8 px-2"
        triggerContent={
          <span className="grid size-6 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {userEmail.slice(0, 2).toUpperCase()}
          </span>
        }
        triggerLabel={`Open profile menu, ${selectedWorkspace?.label ?? "workspace"}`}
      />
    </header>
  );
}

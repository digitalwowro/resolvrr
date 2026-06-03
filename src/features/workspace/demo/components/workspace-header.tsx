"use client";

import {
  Building2,
  Cpu,
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
  settings: SlidersHorizontal,
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
    ...workspaces.map<MenuDropdownItem>((workspace) => ({
      id: `workspace-${workspace.id}`,
      label: workspace.label,
      icon: <Building2 aria-hidden="true" className="size-4" />,
      selected: workspace.id === selectedWorkspaceId,
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
    <header className="flex h-16 items-center gap-3 border-b border-slate-200 bg-white px-4">
      <div className="flex shrink-0 items-center">
        {logoAvailable ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Static brand assets render as supplied from public/brand. */
          <img
            alt="Resolvrr"
            className="h-9 w-auto shrink-0"
            onError={() => setLogoAvailable(false)}
            src="/brand/resolvrr-logo.svg"
          />
        ) : null}
      </div>
      <label className="flex h-10 min-w-0 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">Search workspace</span>
        <input
          className="min-w-0 flex-1 bg-transparent outline-none"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tickets, customers, owners"
          type="search"
          value={query}
        />
      </label>
      <Cpu aria-label="System status" className="size-5 shrink-0 text-slate-500" />
      <MenuDropdown
        align="end"
        items={items}
        showChevron={false}
        triggerClassName="inline-grid size-10 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        triggerContent={
          <span className="grid size-10 place-items-center rounded-full bg-indigo-600 font-semibold text-white">
            {userEmail.slice(0, 2).toUpperCase()}
          </span>
        }
        triggerLabel={`Open profile menu, ${selectedWorkspace?.label ?? "workspace"}`}
        unstyledTrigger
      />
    </header>
  );
}

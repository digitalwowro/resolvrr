"use client";

import {
  Building2,
  LogOut,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { MenuDropdown, type MenuDropdownItem } from "@/components/ui";
import type {
  HelpdeskConnectionActionResult,
  WorkspaceSettingsConnection,
} from "@/features/helpdesk-connections/service-types";
import type { WorkspaceSettingsSection } from "./workspace-settings-dialog";

export type WorkspaceMenuConnection = {
  id: string;
  label: string;
  active: boolean;
  providerKey?: string;
  providerLabel?: string;
  baseUrl?: string;
  status?: WorkspaceSettingsConnection["status"];
};

type WorkspaceHeaderProps = {
  connections: WorkspaceMenuConnection[];
  controls?: ReactNode;
  notifications?: ReactNode;
  logoutAction(formData: FormData): void | Promise<void>;
  onOpenSettings(section: WorkspaceSettingsSection): void;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  userEmail: string;
};

function profileInitials(email: string): string {
  return email.slice(0, 2).toUpperCase();
}

export function WorkspaceHeader({
  connections,
  controls,
  notifications,
  logoutAction,
  onOpenSettings,
  setActiveConnectionAction,
  userEmail,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [logoAvailable, setLogoAvailable] = useState(true);
  const selectedWorkspace = connections.find((connection) => connection.active);
  const items = useMemo<MenuDropdownItem[]>(
    () => {
      const workspaceItems = connections.map<MenuDropdownItem>((connection) => ({
        id: `workspace-${connection.id}`,
        label: connection.label,
        icon: <Building2 aria-hidden="true" className="size-4" />,
        selected: connection.active,
        onSelect: () => {
          const formData = new FormData();
          formData.set("connectionId", connection.id);
          void Promise.resolve(setActiveConnectionAction(formData)).then(() =>
            router.refresh(),
          );
        },
      }));
      return [
        ...workspaceItems,
        ...(workspaceItems.length > 0
          ? [{ type: "separator" as const, id: "workspace-separator" }]
          : []),
        {
          id: "settings",
          label: "Settings",
          icon: <SlidersHorizontal aria-hidden="true" className="size-4" />,
          onSelect: () => onOpenSettings("workspaces"),
        },
        {
          id: "logout",
          label: "Log out",
          icon: <LogOut aria-hidden="true" className="size-4" />,
          onSelect: () => {
            const form = document.getElementById(
              "workspace-logout",
            ) as HTMLFormElement | null;
            form?.requestSubmit();
          },
        },
      ];
    },
    [connections, onOpenSettings, router, setActiveConnectionAction],
  );

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-3">
      <div className="flex shrink-0 items-center">
        {logoAvailable ? (
          /* eslint-disable-next-line @next/next/no-img-element -- Static brand asset supplied in public/brand. */
          <img
            alt="Resolvrr"
            className="h-8 w-auto shrink-0"
            onError={() => setLogoAvailable(false)}
            src="/brand/resolvrr-logo.svg"
          />
        ) : null}
      </div>
      <label className="flex h-8 min-w-40 flex-1 items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 focus-within:border-indigo-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-indigo-100">
        <Search aria-hidden="true" className="size-4 shrink-0" />
        <span className="sr-only">Search workspace</span>
        <input
          className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search tickets, customers, owners"
          type="search"
          value={query}
        />
      </label>
      {controls ? (
        <div className="flex min-w-0 shrink-0 items-center gap-2">{controls}</div>
      ) : null}
      {notifications ? (
        <div className="flex shrink-0 items-center">{notifications}</div>
      ) : null}
      <form action={logoutAction} className="hidden" id="workspace-logout" />
      <MenuDropdown
        align="end"
        items={items}
        showChevron={false}
        triggerClassName="inline-grid size-8 place-items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        triggerContent={
          <span className="grid size-8 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">
            {profileInitials(userEmail)}
          </span>
        }
        triggerLabel={`Open profile menu, ${selectedWorkspace?.label ?? "workspace"}`}
        unstyledTrigger
      />
    </header>
  );
}

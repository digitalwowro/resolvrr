"use client";

import {
  Building2,
  ChevronDown,
  LogOut,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
  onSearchQueryChange?(query: string): void;
  searchQuery?: string;
  setActiveConnectionAction(
    formData: FormData,
  ): void | Promise<void | HelpdeskConnectionActionResult>;
  userAvatarDataUrl?: string | null;
  userDisplayName?: string | null;
  userEmail: string;
  userFirstName?: string | null;
  userLastName?: string | null;
};

function profileInitials({
  displayName,
  email,
  firstName,
  lastName,
}: {
  displayName?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const firstInitial = firstName?.trim().slice(0, 1) ?? "";
  const lastInitial = lastName?.trim().slice(0, 1) ?? "";
  const nameInitials = `${firstInitial}${lastInitial}`;

  if (nameInitials) {
    return nameInitials.toUpperCase();
  }

  const source = displayName?.trim() || email;
  return source.slice(0, 2).toUpperCase();
}

function profileDisplayName({
  displayName,
  email,
  firstName,
  lastName,
}: {
  displayName?: string | null;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
}): string {
  const givenName = firstName?.trim();
  const familyInitial = lastName?.trim().slice(0, 1);

  if (givenName && familyInitial) {
    return `${givenName} ${familyInitial.toUpperCase()}.`;
  }

  return givenName || displayName?.trim() || email;
}

export function WorkspaceHeader({
  connections,
  controls,
  notifications,
  logoutAction,
  onOpenSettings,
  onSearchQueryChange,
  searchQuery,
  setActiveConnectionAction,
  userAvatarDataUrl,
  userDisplayName,
  userEmail,
  userFirstName,
  userLastName,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const [logoAvailable, setLogoAvailable] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchEnabled = Boolean(onSearchQueryChange);
  const query = searchEnabled ? searchQuery ?? "" : "";
  const searchPlaceholder = searchEnabled
    ? "Filter loaded tickets by number, title, customer, or owner"
    : "Ticket filter unavailable";
  const selectedWorkspace = connections.find((connection) => connection.active);
  const displayName = profileDisplayName({
    displayName: userDisplayName,
    email: userEmail,
    firstName: userFirstName,
    lastName: userLastName,
  });
  const workspaceLabel = selectedWorkspace?.label ?? "No workspace";
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
          onSelect: () => onOpenSettings("profile"),
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

  useEffect(() => {
    function handleShortcut(event: globalThis.KeyboardEvent) {
      if (
        !searchEnabled ||
        event.key.toLowerCase() !== "k" ||
        (!event.metaKey && !event.ctrlKey) ||
        event.altKey
      ) {
        return;
      }

      event.preventDefault();
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [searchEnabled]);

  function handleQueryChange(nextQuery: string) {
    if (!onSearchQueryChange) {
      return;
    }

    onSearchQueryChange(nextQuery);
  }

  return (
    <header className="flex h-12 shrink-0 items-center gap-2 border-b border-indigo-900 bg-indigo-950 px-4">
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
      <label className="flex h-8 min-w-40 max-w-[480px] flex-1 items-center gap-2 rounded-md border border-indigo-800 bg-indigo-900 px-3 text-indigo-100 focus-within:border-indigo-300 focus-within:bg-indigo-900 focus-within:outline focus-within:outline-2 focus-within:outline-indigo-400">
        <Search aria-hidden="true" className="size-3 shrink-0 text-indigo-200" />
        <span className="sr-only">Filter loaded tickets</span>
        <input
          ref={searchInputRef}
          className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-indigo-200/70 disabled:cursor-not-allowed disabled:text-indigo-200/60 disabled:placeholder:text-indigo-200/50"
          disabled={!searchEnabled}
          onChange={(event) => handleQueryChange(event.currentTarget.value)}
          placeholder={searchPlaceholder}
          type="search"
          value={query}
        />
        {searchEnabled ? (
          <kbd
            aria-hidden="true"
            className="hidden h-5 shrink-0 items-center rounded border border-indigo-700 bg-indigo-800 px-1.5 text-[11px] font-medium leading-none text-indigo-100 sm:inline-flex"
          >
            Ctrl/Cmd K
          </kbd>
        ) : null}
      </label>
      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2">
        {controls ? (
          <div className="flex min-w-0 shrink-0 items-center gap-2">
            {controls}
          </div>
        ) : null}
        {notifications ? (
          <div className="flex shrink-0 items-center">{notifications}</div>
        ) : null}
        <form action={logoutAction} className="hidden" id="workspace-logout" />
        <MenuDropdown
          align="end"
          items={items}
          showChevron={false}
          triggerClassName="flex h-10 max-w-64 items-center gap-2 rounded-md px-1.5 text-left text-white hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          triggerContent={
            <span className="flex min-w-0 items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white text-xs font-semibold text-indigo-900 ring-1 ring-indigo-200/70">
                {userAvatarDataUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element -- User avatar is stored as a validated data URL. */
                  <img
                    alt=""
                    className="size-8 rounded-full object-cover"
                    src={userAvatarDataUrl}
                  />
                ) : (
                  profileInitials({
                    displayName: userDisplayName,
                    email: userEmail,
                    firstName: userFirstName,
                    lastName: userLastName,
                  })
                )}
              </span>
              <span className="hidden min-w-0 leading-tight sm:block">
                <span className="block truncate text-sm font-semibold text-white">
                  {displayName}
                </span>
                <span className="block truncate text-xs font-medium text-indigo-200">
                  {workspaceLabel}
                </span>
              </span>
              <ChevronDown
                aria-hidden="true"
                className="hidden size-4 shrink-0 text-indigo-200 sm:block"
              />
            </span>
          }
          triggerLabel={`Open profile menu, ${workspaceLabel}`}
          unstyledTrigger
        />
      </div>
    </header>
  );
}

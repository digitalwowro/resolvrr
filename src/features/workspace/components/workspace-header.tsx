"use client";

import {
  Building2,
  ChevronDown,
  LogOut,
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
import {
  WorkspaceTicketSearch,
  type WorkspaceTicketSearchProps,
} from "./workspace-ticket-search";

export type WorkspaceMenuConnection = {
  id: string;
  label: string;
  active: boolean;
  providerKey?: string;
  providerLabel?: string;
  baseUrl?: string;
  status?: WorkspaceSettingsConnection["status"];
  connectionId?: string | null;
  connectedAs?: string | null;
  identityVersion?: string | null;
  access?: WorkspaceSettingsConnection["access"];
};

type WorkspaceHeaderProps = {
  connections: WorkspaceMenuConnection[];
  controls?: ReactNode;
  notifications?: ReactNode;
  logoutAction(formData: FormData): void | Promise<void>;
  onOpenSettings(section: WorkspaceSettingsSection): void;
  ticketSearch?: WorkspaceTicketSearchProps;
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
  ticketSearch,
  setActiveConnectionAction,
  userAvatarDataUrl,
  userDisplayName,
  userEmail,
  userFirstName,
  userLastName,
}: WorkspaceHeaderProps) {
  const router = useRouter();
  const [logoAvailable, setLogoAvailable] = useState(true);
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

  return (
    <header className="relative z-20 flex h-12 shrink-0 items-center gap-2 border-b border-indigo-900 bg-indigo-950 px-4">
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
      {ticketSearch ? <WorkspaceTicketSearch {...ticketSearch} /> : null}
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

"use client";

import type { MenuDropdownItem } from "./menu-dropdown";
import { MenuDropdown } from "./menu-dropdown";

type ProfileMenuProps = {
  displayName: string;
  subtitle?: string;
  initials?: string;
  items: MenuDropdownItem[];
};

export function ProfileMenu({
  displayName,
  subtitle,
  initials,
  items,
}: ProfileMenuProps) {
  const avatarText = initials ?? displayName.slice(0, 2).toUpperCase();

  return (
    <MenuDropdown
      align="end"
      items={items}
      triggerContent={
        <span className="flex min-w-0 items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {avatarText}
          </span>
          <span className="min-w-0 text-left">
            <span className="block truncate text-sm font-medium text-slate-800">
              {displayName}
            </span>
            {subtitle ? (
              <span className="block truncate text-xs text-slate-500">
                {subtitle}
              </span>
            ) : null}
          </span>
        </span>
      }
      triggerLabel={`Open profile menu for ${displayName}`}
    />
  );
}

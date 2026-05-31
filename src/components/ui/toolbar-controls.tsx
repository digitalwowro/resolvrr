"use client";

import type { ComponentProps } from "react";
import { Button } from "./button";
import { cn } from "./classnames";
import { DropdownSelect } from "./dropdown-select";
import { MenuDropdown } from "./menu-dropdown";
import { SearchableDropdown } from "./searchable-dropdown";

const toolbarControlClass = "!h-8 !gap-1.5 !px-3 !text-sm !font-normal";
const toolbarDropdownChildrenClass = "!text-sm";

export function ToolbarButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return <Button className={cn(toolbarControlClass, className)} {...props} />;
}

export function ToolbarDropdownSelect({
  triggerClassName,
  menuClassName,
  ...props
}: ComponentProps<typeof DropdownSelect>) {
  return (
    <DropdownSelect
      menuClassName={cn(toolbarDropdownChildrenClass, menuClassName)}
      triggerClassName={cn(toolbarControlClass, triggerClassName)}
      {...props}
    />
  );
}

export function ToolbarSearchableDropdown({
  triggerClassName,
  menuClassName,
  ...props
}: ComponentProps<typeof SearchableDropdown>) {
  return (
    <SearchableDropdown
      menuClassName={cn(toolbarDropdownChildrenClass, menuClassName)}
      triggerClassName={cn(toolbarControlClass, triggerClassName)}
      {...props}
    />
  );
}

export function ToolbarMenuDropdown({
  triggerClassName,
  menuClassName,
  ...props
}: ComponentProps<typeof MenuDropdown>) {
  return (
    <MenuDropdown
      menuClassName={cn(toolbarDropdownChildrenClass, menuClassName)}
      triggerClassName={cn(toolbarControlClass, triggerClassName)}
      {...props}
    />
  );
}

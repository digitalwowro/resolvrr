"use client";

import { CircleCheck, List, Ticket } from "lucide-react";
import { useSyncExternalStore, type ReactNode } from "react";
import { DropdownSelect, Tooltip, type DropdownOption } from "@/components/ui";
import type { PostUpdateNavigation } from "./post-update-navigation";
import {
  defaultPostUpdateNavigation,
  isPostUpdateNavigation,
  postUpdateNavigationStorageKey,
  readPostUpdateNavigationPreference,
  writePostUpdateNavigationPreference,
} from "./post-update-navigation";

const postUpdateNavigationChangeEvent =
  "resolvrr:post-update-navigation-change";

function optionIcon({
  children,
  tooltip,
}: {
  children: ReactNode;
  tooltip: string;
}) {
  return (
    <Tooltip content={tooltip} delayMs={150} side="top">
      {children}
    </Tooltip>
  );
}

const navigationOptions: DropdownOption[] = [
  {
    value: "keep_ticket_open",
    label: "Keep this tab open",
    icon: optionIcon({
      tooltip: "After Update, keep this ticket selected.",
      children: <Ticket aria-hidden="true" className="size-3.5" />,
    }),
  },
  {
    value: "return_to_list",
    label: "Close tab & go to List",
    icon: optionIcon({
      tooltip: "After Update, close this ticket tab and show the List.",
      children: <List aria-hidden="true" className="size-3.5" />,
    }),
  },
  {
    value: "return_to_list_when_closed",
    label: "Close tab if state is Closed",
    icon: optionIcon({
      tooltip:
        "After Update, close this tab only when the final ticket state is Closed.",
      children: <CircleCheck aria-hidden="true" className="size-3.5" />,
    }),
  },
];

function subscribePostUpdateNavigationPreference(listener: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === postUpdateNavigationStorageKey) {
      listener();
    }
  }

  window.addEventListener("storage", handleStorage);
  window.addEventListener(postUpdateNavigationChangeEvent, listener);
  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(postUpdateNavigationChangeEvent, listener);
  };
}

export function usePostUpdateNavigationPreference() {
  const value = useSyncExternalStore(
    subscribePostUpdateNavigationPreference,
    readPostUpdateNavigationPreference,
    () => defaultPostUpdateNavigation,
  );

  function updateValue(nextValue: PostUpdateNavigation) {
    writePostUpdateNavigationPreference(nextValue);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event(postUpdateNavigationChangeEvent));
    }
  }

  return [value, updateValue] as const;
}

export function PostUpdateNavigationSelector({
  value,
  onValueChange,
}: {
  value: PostUpdateNavigation;
  onValueChange(value: PostUpdateNavigation): void;
}) {
  function handleValueChange(nextValue: string) {
    if (isPostUpdateNavigation(nextValue)) {
      onValueChange(nextValue);
    }
  }

  return (
    <DropdownSelect
      ariaLabel="Post-update navigation"
      className="block"
      menuClassName="!top-auto bottom-full mb-1 min-w-full"
      onValueChange={handleValueChange}
      options={navigationOptions}
      triggerClassName="h-8 text-sm font-normal"
      value={value}
    />
  );
}

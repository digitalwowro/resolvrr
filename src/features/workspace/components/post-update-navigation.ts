import type { TicketState } from "@/core/tickets";

export const postUpdateNavigationStorageKey =
  "resolvrr.workspace.postUpdateNavigation";

export const postUpdateNavigationOptions = [
  "keep_ticket_open",
  "return_to_list",
  "return_to_list_when_closed",
] as const;

export type PostUpdateNavigation = (typeof postUpdateNavigationOptions)[number];

export const defaultPostUpdateNavigation: PostUpdateNavigation =
  "keep_ticket_open";

export function isPostUpdateNavigation(
  value: string | null,
): value is PostUpdateNavigation {
  return postUpdateNavigationOptions.includes(value as PostUpdateNavigation);
}

export function readPostUpdateNavigationPreference(
  storage: Pick<Storage, "getItem"> | undefined =
    typeof window === "undefined" ? undefined : window.localStorage,
): PostUpdateNavigation {
  if (!storage) {
    return defaultPostUpdateNavigation;
  }

  try {
    const value = storage.getItem(postUpdateNavigationStorageKey);
    return isPostUpdateNavigation(value) ? value : defaultPostUpdateNavigation;
  } catch {
    return defaultPostUpdateNavigation;
  }
}

export function writePostUpdateNavigationPreference(
  value: PostUpdateNavigation,
  storage: Pick<Storage, "setItem"> | undefined =
    typeof window === "undefined" ? undefined : window.localStorage,
) {
  if (!storage) {
    return;
  }

  try {
    storage.setItem(postUpdateNavigationStorageKey, value);
  } catch {
    // Browser storage is a convenience, not a requirement for updating tickets.
  }
}

export function shouldReturnToListAfterUpdate({
  finalState,
  navigation,
}: {
  finalState?: TicketState;
  navigation: PostUpdateNavigation;
}): boolean {
  return (
    navigation === "return_to_list" ||
    (navigation === "return_to_list_when_closed" && finalState === "closed")
  );
}

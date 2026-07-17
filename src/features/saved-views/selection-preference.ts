import type { Prisma } from "@/generated/prisma/client";

export const workspaceSelectedSavedViewPreferenceKey =
  "workspace.selectedSavedView";
export const workspaceSelectedSavedViewPreferenceVersion = 1;

export type WorkspaceSelectedSavedViewPreference = {
  savedViewId: string;
  version: typeof workspaceSelectedSavedViewPreferenceVersion;
};

export type SaveWorkspaceSelectedSavedViewAction = (
  savedViewId: string,
) => Promise<{ status: "saved" | "unavailable" }>;

export function workspaceSelectedSavedViewPreferenceFromStorage(
  value: Prisma.JsonValue | unknown,
): WorkspaceSelectedSavedViewPreference | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  const savedViewId =
    typeof record.savedViewId === "string" ? record.savedViewId.trim() : "";
  if (
    record.version !== workspaceSelectedSavedViewPreferenceVersion ||
    !savedViewId
  ) {
    return undefined;
  }

  return {
    savedViewId,
    version: workspaceSelectedSavedViewPreferenceVersion,
  };
}

export function workspaceSelectedSavedViewPreferenceToStorage(
  savedViewId: string,
): Prisma.InputJsonValue {
  return {
    savedViewId,
    version: workspaceSelectedSavedViewPreferenceVersion,
  };
}

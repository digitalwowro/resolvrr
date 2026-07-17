"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaSavedViewSelectionRepository } from "@/data/saved-view-selection-repository";
import { prismaSavedViewsRepository } from "@/data/saved-views-repository";
import { allTicketsSavedViewId } from "./workspace";

export async function saveWorkspaceSelectedSavedViewAction(
  savedViewId: string,
): Promise<{ status: "saved" | "unavailable" }> {
  const normalizedId = savedViewId.trim();
  if (!normalizedId) {
    return { status: "unavailable" };
  }

  const user = await requireCurrentUser();
  const workspaceId =
    await prismaHelpdeskConnectionsRepository.getActiveWorkspaceId(user.id);
  if (!workspaceId) {
    return { status: "unavailable" };
  }

  if (normalizedId !== allTicketsSavedViewId) {
    const savedView = await prismaSavedViewsRepository.findForUser(
      user.id,
      normalizedId,
      workspaceId,
    );
    if (!savedView) {
      return { status: "unavailable" };
    }
  }

  await prismaSavedViewSelectionRepository.setForUser(
    user.id,
    workspaceId,
    normalizedId,
  );
  return { status: "saved" };
}

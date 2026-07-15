"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaWorkspaceTabsRepository } from "@/data/workspace-tabs-repository";
import {
  workspaceOpenTabsStateFromStorage,
  type WorkspaceOpenTabsState,
} from "./workspace-tab-state";

export async function saveWorkspaceOpenTabsStateAction(
  state: WorkspaceOpenTabsState,
): Promise<void> {
  const parsedState = workspaceOpenTabsStateFromStorage(state);
  if (!parsedState) {
    return;
  }

  const user = await requireCurrentUser();
  const activeWorkspaceId =
    await prismaHelpdeskConnectionsRepository.getActiveWorkspaceId(user.id);
  if (!activeWorkspaceId) {
    return;
  }

  await prismaWorkspaceTabsRepository.setForUser(
    user.id,
    activeWorkspaceId,
    parsedState,
  );
}

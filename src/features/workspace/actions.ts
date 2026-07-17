"use server";

import { z } from "zod";
import { requireCurrentUser } from "@/auth/current-user";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaWorkspaceTabsRepository } from "@/data/workspace-tabs-repository";
import {
  workspaceOpenTabsStateFromStorage,
  type WorkspaceOpenTabsState,
} from "./workspace-tab-state";

export async function saveWorkspaceOpenTabsStateAction(
  state: WorkspaceOpenTabsState,
  rawWorkspaceId: string,
): Promise<void> {
  const parsedState = workspaceOpenTabsStateFromStorage(state);
  const workspaceId = z.string().trim().min(1).max(128).safeParse(
    rawWorkspaceId,
  );
  if (!parsedState || !workspaceId.success) {
    return;
  }

  const user = await requireCurrentUser();
  const workspace = await prismaHelpdeskConnectionsRepository.findWorkspaceForUser(
    user.id,
    workspaceId.data,
  );
  if (!workspace) {
    return;
  }

  await prismaWorkspaceTabsRepository.setForUser(
    user.id,
    workspace.id,
    parsedState,
  );
}

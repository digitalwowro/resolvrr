import { prisma } from "@/data/prisma";
import {
  workspaceOpenTabsPreferenceKey,
  workspaceOpenTabsStateFromStorage,
  workspaceOpenTabsStateToStorage,
  type WorkspaceOpenTabsState,
} from "@/features/workspace/workspace-tab-state";

export type WorkspaceTabsRepository = {
  getForUser(
    userId: string,
    workspaceId: string,
  ): Promise<WorkspaceOpenTabsState | undefined>;
  setForUser(
    userId: string,
    workspaceId: string,
    state: WorkspaceOpenTabsState,
  ): Promise<void>;
};

export const prismaWorkspaceTabsRepository: WorkspaceTabsRepository = {
  async getForUser(userId, workspaceId) {
    const preference = await prisma.uiPreference.findFirst({
      where: {
        userId,
        workspaceId,
        key: workspaceOpenTabsPreferenceKey,
      },
      select: { valueJson: true },
    });

    return workspaceOpenTabsStateFromStorage(preference?.valueJson);
  },

  async setForUser(userId, workspaceId, state) {
    const valueJson = workspaceOpenTabsStateToStorage(state);

    await prisma.uiPreference.upsert({
      where: {
        userId_workspaceId_key: {
          userId,
          workspaceId,
          key: workspaceOpenTabsPreferenceKey,
        },
      },
      create: {
        userId,
        workspaceId,
        key: workspaceOpenTabsPreferenceKey,
        valueJson,
      },
      update: { valueJson },
    });
  },
};

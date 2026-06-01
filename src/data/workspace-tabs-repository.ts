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
    helpdeskConnectionId: string,
  ): Promise<WorkspaceOpenTabsState | undefined>;
  setForUser(
    userId: string,
    helpdeskConnectionId: string,
    state: WorkspaceOpenTabsState,
  ): Promise<void>;
};

export const prismaWorkspaceTabsRepository: WorkspaceTabsRepository = {
  async getForUser(userId, helpdeskConnectionId) {
    const preference = await prisma.uiPreference.findFirst({
      where: {
        userId,
        helpdeskConnectionId,
        key: workspaceOpenTabsPreferenceKey,
      },
      select: { valueJson: true },
    });

    return workspaceOpenTabsStateFromStorage(preference?.valueJson);
  },

  async setForUser(userId, helpdeskConnectionId, state) {
    const valueJson = workspaceOpenTabsStateToStorage(state);

    await prisma.uiPreference.upsert({
      where: {
        userId_helpdeskConnectionId_key: {
          userId,
          helpdeskConnectionId,
          key: workspaceOpenTabsPreferenceKey,
        },
      },
      create: {
        userId,
        helpdeskConnectionId,
        key: workspaceOpenTabsPreferenceKey,
        valueJson,
      },
      update: { valueJson },
    });
  },
};

import { prisma } from "@/data/prisma";
import {
  workspaceSelectedSavedViewPreferenceFromStorage,
  workspaceSelectedSavedViewPreferenceKey,
  workspaceSelectedSavedViewPreferenceToStorage,
} from "@/features/saved-views/selection-preference";

export type SavedViewSelectionRepository = {
  getForUser(userId: string, workspaceId: string): Promise<string | undefined>;
  setForUser(
    userId: string,
    workspaceId: string,
    savedViewId: string,
  ): Promise<void>;
};

export const prismaSavedViewSelectionRepository: SavedViewSelectionRepository = {
  async getForUser(userId, workspaceId) {
    const preference = await prisma.uiPreference.findFirst({
      where: {
        userId,
        workspaceId,
        key: workspaceSelectedSavedViewPreferenceKey,
      },
      select: { valueJson: true },
    });

    return workspaceSelectedSavedViewPreferenceFromStorage(
      preference?.valueJson,
    )?.savedViewId;
  },

  async setForUser(userId, workspaceId, savedViewId) {
    const valueJson =
      workspaceSelectedSavedViewPreferenceToStorage(savedViewId);

    await prisma.uiPreference.upsert({
      where: {
        userId_workspaceId_key: {
          userId,
          workspaceId,
          key: workspaceSelectedSavedViewPreferenceKey,
        },
      },
      create: {
        userId,
        workspaceId,
        key: workspaceSelectedSavedViewPreferenceKey,
        valueJson,
      },
      update: { valueJson },
    });
  },
};

import { randomUUID } from "node:crypto";
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
    const serialized = JSON.stringify(valueJson);

    await prisma.$executeRaw`
      INSERT INTO "UiPreference" (
        "id", "userId", "workspaceId", "key", "valueJson", "createdAt", "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${userId},
        ${workspaceId},
        ${workspaceOpenTabsPreferenceKey},
        CAST(${serialized} AS JSONB),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      )
      ON CONFLICT ("userId", "workspaceId", "key") DO UPDATE
      SET
        "valueJson" = EXCLUDED."valueJson",
        "updatedAt" = CURRENT_TIMESTAMP
      WHERE
        COALESCE("UiPreference"."valueJson" ->> 'updatedAt', '') !~
          '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\\.[0-9]{3}Z$'
        OR ("UiPreference"."valueJson" ->> 'updatedAt') <=
          (EXCLUDED."valueJson" ->> 'updatedAt')
    `;
  },
};

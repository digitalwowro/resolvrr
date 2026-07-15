import { prisma } from "@/data/prisma";
import type { MyStyleRepository } from "@/features/ai/my-style-repository";

export const prismaMyStyleRepository: MyStyleRepository = {
  async deleteMyStyle(userId, workspaceId) {
    await prisma.workspaceMyStyle.deleteMany({
      where: { workspaceId, userId },
    });
  },

  async getMyStyle(userId, workspaceId) {
    const record = await prisma.workspaceMyStyle.findUnique({
      where: {
        userId_workspaceId: {
          workspaceId,
          userId,
        },
      },
      select: {
        encryptedStyle: true,
        keyVersion: true,
        updatedAt: true,
      },
    });
    return record;
  },

  async upsertMyStyle(input) {
    await prisma.workspaceMyStyle.upsert({
      where: {
        userId_workspaceId: {
          workspaceId: input.workspaceId,
          userId: input.userId,
        },
      },
      create: {
        encryptedStyle: input.encryptedStyle,
        workspaceId: input.workspaceId,
        keyVersion: input.keyVersion,
        userId: input.userId,
      },
      update: {
        encryptedStyle: input.encryptedStyle,
        keyVersion: input.keyVersion,
      },
    });
  },
};

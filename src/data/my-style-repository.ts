import { prisma } from "@/data/prisma";
import type { MyStyleRepository } from "@/features/ai/my-style-repository";

export const prismaMyStyleRepository: MyStyleRepository = {
  async deleteMyStyle(userId, helpdeskConnectionId) {
    await prisma.workspaceMyStyle.deleteMany({
      where: { helpdeskConnectionId, userId },
    });
  },

  async getMyStyle(userId, helpdeskConnectionId) {
    const record = await prisma.workspaceMyStyle.findUnique({
      where: {
        userId_helpdeskConnectionId: {
          helpdeskConnectionId,
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
        userId_helpdeskConnectionId: {
          helpdeskConnectionId: input.helpdeskConnectionId,
          userId: input.userId,
        },
      },
      create: {
        encryptedStyle: input.encryptedStyle,
        helpdeskConnectionId: input.helpdeskConnectionId,
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

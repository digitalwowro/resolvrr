import { prisma } from "@/data/prisma";
import type { MyStyleRepository } from "@/features/ai/my-style-repository";

export const prismaMyStyleRepository: MyStyleRepository = {
  async deleteMyStyle(userId) {
    await prisma.userMyStyle.deleteMany({ where: { userId } });
  },

  async getMyStyle(userId) {
    const record = await prisma.userMyStyle.findUnique({
      where: { userId },
      select: {
        encryptedStyle: true,
        keyVersion: true,
        updatedAt: true,
      },
    });
    return record;
  },

  async upsertMyStyle(input) {
    await prisma.userMyStyle.upsert({
      where: { userId: input.userId },
      create: {
        encryptedStyle: input.encryptedStyle,
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

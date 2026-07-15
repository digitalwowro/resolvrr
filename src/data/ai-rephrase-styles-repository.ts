import { prisma } from "@/data/prisma";
import type {
  AiRephraseStyleRepository,
  StoredUserAiRephraseStyleOverride,
  StoredWorkspaceAiRephraseStyle,
} from "@/features/ai/rephrase-style-repository";

function styleRecord(record: {
  encryptedPrompt: string | null;
  id: string;
  isEnabled: boolean;
  keyVersion: string;
  label: string;
  seedKey: string | null;
  sortOrder: number;
  updatedAt: Date;
}): StoredWorkspaceAiRephraseStyle {
  return {
    encryptedPrompt: record.encryptedPrompt,
    id: record.id,
    isEnabled: record.isEnabled,
    keyVersion: record.keyVersion,
    label: record.label,
    seedKey: record.seedKey,
    sortOrder: record.sortOrder,
    updatedAt: record.updatedAt,
  };
}

function overrideRecord(record: {
  encryptedPrompt: string;
  keyVersion: string;
  styleId: string;
  updatedAt: Date;
}): StoredUserAiRephraseStyleOverride {
  return {
    encryptedPrompt: record.encryptedPrompt,
    keyVersion: record.keyVersion,
    styleId: record.styleId,
    updatedAt: record.updatedAt,
  };
}

export const prismaAiRephraseStyleRepository: AiRephraseStyleRepository = {
  async createWorkspaceStyle(input) {
    const record = await prisma.workspaceAiRephraseStyle.create({
      data: {
        encryptedPrompt: input.encryptedPrompt,
        workspaceId: input.workspaceId,
        keyVersion: input.keyVersion,
        label: input.label,
        sortOrder: input.sortOrder,
      },
    });
    return styleRecord(record);
  },

  async deleteUserStyleOverride(input) {
    await prisma.userAiRephraseStyleOverride.deleteMany({
      where: {
        workspaceId: input.workspaceId,
        styleId: input.styleId,
        userId: input.userId,
      },
    });
  },

  async deleteWorkspaceStyle(input) {
    const style = await prisma.workspaceAiRephraseStyle.findFirst({
      where: {
        workspaceId: input.workspaceId,
        id: input.styleId,
      },
      select: { seedKey: true },
    });
    if (!style) {
      return;
    }
    if (style.seedKey) {
      await prisma.workspaceAiRephraseStyle.updateMany({
        where: {
          workspaceId: input.workspaceId,
          id: input.styleId,
        },
        data: { isEnabled: false },
      });
      return;
    }
    await prisma.workspaceAiRephraseStyle.deleteMany({
      where: {
        workspaceId: input.workspaceId,
        id: input.styleId,
      },
    });
  },

  async getUserStyleOverride(input) {
    const record = await prisma.userAiRephraseStyleOverride.findUnique({
      where: {
        userId_workspaceId_styleId: {
          workspaceId: input.workspaceId,
          styleId: input.styleId,
          userId: input.userId,
        },
      },
    });
    return record ? overrideRecord(record) : null;
  },

  async getWorkspaceStyle(input) {
    const record = await prisma.workspaceAiRephraseStyle.findFirst({
      where: {
        workspaceId: input.workspaceId,
        id: input.styleId,
      },
    });
    return record ? styleRecord(record) : null;
  },

  async listUserStyleOverrides(input) {
    const records = await prisma.userAiRephraseStyleOverride.findMany({
      where: {
        workspaceId: input.workspaceId,
        userId: input.userId,
      },
    });
    return records.map(overrideRecord);
  },

  async listWorkspaceStyles(workspaceId) {
    const records = await prisma.workspaceAiRephraseStyle.findMany({
      where: { workspaceId },
      orderBy: [{ sortOrder: "asc" }, { label: "asc" }],
    });
    return records.map(styleRecord);
  },

  async updateWorkspaceStyle(input) {
    const record = await prisma.workspaceAiRephraseStyle.updateManyAndReturn({
      where: {
        workspaceId: input.workspaceId,
        id: input.styleId,
      },
      data: {
        encryptedPrompt: input.encryptedPrompt,
        isEnabled: input.isEnabled,
        keyVersion: input.keyVersion,
        label: input.label,
      },
      limit: 1,
    });
    return record[0] ? styleRecord(record[0]) : null;
  },

  async updateWorkspaceStyleOrder(input) {
    await prisma.$transaction(
      input.orderedStyleIds.map((styleId, index) =>
        prisma.workspaceAiRephraseStyle.updateMany({
          where: {
            workspaceId: input.workspaceId,
            id: styleId,
          },
          data: { sortOrder: (index + 1) * 10 },
        }),
      ),
    );
  },

  async upsertUserStyleOverride(input) {
    await prisma.userAiRephraseStyleOverride.upsert({
      where: {
        userId_workspaceId_styleId: {
          workspaceId: input.workspaceId,
          styleId: input.styleId,
          userId: input.userId,
        },
      },
      create: {
        encryptedPrompt: input.encryptedPrompt,
        workspaceId: input.workspaceId,
        keyVersion: input.keyVersion,
        styleId: input.styleId,
        userId: input.userId,
      },
      update: {
        encryptedPrompt: input.encryptedPrompt,
        keyVersion: input.keyVersion,
      },
    });
  },
};

import { prisma } from "@/data/prisma";
import type {
  AiPromptRepository,
  UpsertUserAiPromptOverrideInput,
  UpsertWorkspaceAiPromptInput,
} from "@/features/ai/prompt-repository";

function promptRecord(record: {
  encryptedPrompt: string;
  keyVersion: string;
  promptKey: string;
  updatedAt: Date;
}) {
  return {
    encryptedPrompt: record.encryptedPrompt,
    keyVersion: record.keyVersion,
    promptKey: record.promptKey,
    updatedAt: record.updatedAt,
  };
}

export const prismaAiPromptRepository: AiPromptRepository = {
  async deleteUserPromptOverride(input) {
    await prisma.userAiPromptOverride.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        promptKey: input.promptKey,
        userId: input.userId,
      },
    });
  },

  async deleteWorkspacePrompt(input) {
    await prisma.workspaceAiPrompt.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        promptKey: input.promptKey,
      },
    });
  },

  async getUserPromptOverride(input) {
    const record = await prisma.userAiPromptOverride.findUnique({
      where: {
        userId_helpdeskConnectionId_promptKey: {
          helpdeskConnectionId: input.helpdeskConnectionId,
          promptKey: input.promptKey,
          userId: input.userId,
        },
      },
    });
    return record ? promptRecord(record) : null;
  },

  async getWorkspacePrompt(input) {
    const record = await prisma.workspaceAiPrompt.findUnique({
      where: {
        helpdeskConnectionId_promptKey: {
          helpdeskConnectionId: input.helpdeskConnectionId,
          promptKey: input.promptKey,
        },
      },
    });
    return record ? promptRecord(record) : null;
  },

  async listUserPromptOverrides(input) {
    const records = await prisma.userAiPromptOverride.findMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        userId: input.userId,
      },
    });
    return records.map(promptRecord);
  },

  async listWorkspacePrompts(helpdeskConnectionId) {
    const records = await prisma.workspaceAiPrompt.findMany({
      where: { helpdeskConnectionId },
    });
    return records.map(promptRecord);
  },

  async upsertUserPromptOverride(input: UpsertUserAiPromptOverrideInput) {
    await prisma.userAiPromptOverride.upsert({
      where: {
        userId_helpdeskConnectionId_promptKey: {
          helpdeskConnectionId: input.helpdeskConnectionId,
          promptKey: input.promptKey,
          userId: input.userId,
        },
      },
      create: {
        encryptedPrompt: input.encryptedPrompt,
        helpdeskConnectionId: input.helpdeskConnectionId,
        keyVersion: input.keyVersion,
        promptKey: input.promptKey,
        userId: input.userId,
      },
      update: {
        encryptedPrompt: input.encryptedPrompt,
        keyVersion: input.keyVersion,
      },
    });
  },

  async upsertWorkspacePrompt(input: UpsertWorkspaceAiPromptInput) {
    await prisma.workspaceAiPrompt.upsert({
      where: {
        helpdeskConnectionId_promptKey: {
          helpdeskConnectionId: input.helpdeskConnectionId,
          promptKey: input.promptKey,
        },
      },
      create: {
        encryptedPrompt: input.encryptedPrompt,
        helpdeskConnectionId: input.helpdeskConnectionId,
        keyVersion: input.keyVersion,
        promptKey: input.promptKey,
      },
      update: {
        encryptedPrompt: input.encryptedPrompt,
        keyVersion: input.keyVersion,
      },
    });
  },
};

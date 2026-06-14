import { prisma } from "@/data/prisma";
import type {
  AiPromptRepository,
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
  async deleteWorkspacePrompt(input) {
    await prisma.workspaceAiPrompt.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        promptKey: input.promptKey,
      },
    });
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

  async listWorkspacePrompts(helpdeskConnectionId) {
    const records = await prisma.workspaceAiPrompt.findMany({
      where: { helpdeskConnectionId },
    });
    return records.map(promptRecord);
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

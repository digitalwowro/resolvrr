import type { AiPromptKey } from "./prompt-registry";

export type StoredAiPrompt = {
  encryptedPrompt: string;
  keyVersion: string;
  promptKey: string;
  updatedAt: Date;
};

export type UpsertWorkspaceAiPromptInput = {
  encryptedPrompt: string;
  workspaceId: string;
  keyVersion: string;
  promptKey: AiPromptKey;
};

export type AiPromptRepository = {
  deleteWorkspacePrompt(input: {
    workspaceId: string;
    promptKey: AiPromptKey;
  }): Promise<void>;
  getWorkspacePrompt(input: {
    workspaceId: string;
    promptKey: AiPromptKey;
  }): Promise<StoredAiPrompt | null>;
  listWorkspacePrompts(workspaceId: string): Promise<StoredAiPrompt[]>;
  upsertWorkspacePrompt(input: UpsertWorkspaceAiPromptInput): Promise<void>;
};

import type { AiPromptKey } from "./prompt-registry";

export type StoredAiPrompt = {
  encryptedPrompt: string;
  keyVersion: string;
  promptKey: string;
  updatedAt: Date;
};

export type UpsertWorkspaceAiPromptInput = {
  encryptedPrompt: string;
  helpdeskConnectionId: string;
  keyVersion: string;
  promptKey: AiPromptKey;
};

export type AiPromptRepository = {
  deleteWorkspacePrompt(input: {
    helpdeskConnectionId: string;
    promptKey: AiPromptKey;
  }): Promise<void>;
  getWorkspacePrompt(input: {
    helpdeskConnectionId: string;
    promptKey: AiPromptKey;
  }): Promise<StoredAiPrompt | null>;
  listWorkspacePrompts(helpdeskConnectionId: string): Promise<StoredAiPrompt[]>;
  upsertWorkspacePrompt(input: UpsertWorkspaceAiPromptInput): Promise<void>;
};

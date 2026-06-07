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

export type UpsertUserAiPromptOverrideInput =
  UpsertWorkspaceAiPromptInput & {
    userId: string;
  };

export type AiPromptRepository = {
  deleteUserPromptOverride(input: {
    helpdeskConnectionId: string;
    promptKey: AiPromptKey;
    userId: string;
  }): Promise<void>;
  deleteWorkspacePrompt(input: {
    helpdeskConnectionId: string;
    promptKey: AiPromptKey;
  }): Promise<void>;
  getUserPromptOverride(input: {
    helpdeskConnectionId: string;
    promptKey: AiPromptKey;
    userId: string;
  }): Promise<StoredAiPrompt | null>;
  getWorkspacePrompt(input: {
    helpdeskConnectionId: string;
    promptKey: AiPromptKey;
  }): Promise<StoredAiPrompt | null>;
  listUserPromptOverrides(input: {
    helpdeskConnectionId: string;
    userId: string;
  }): Promise<StoredAiPrompt[]>;
  listWorkspacePrompts(helpdeskConnectionId: string): Promise<StoredAiPrompt[]>;
  upsertUserPromptOverride(
    input: UpsertUserAiPromptOverrideInput,
  ): Promise<void>;
  upsertWorkspacePrompt(input: UpsertWorkspaceAiPromptInput): Promise<void>;
};

export type StoredWorkspaceAiRephraseStyle = {
  encryptedPrompt: string | null;
  id: string;
  isEnabled: boolean;
  keyVersion: string;
  label: string;
  seedKey: string | null;
  sortOrder: number;
  updatedAt: Date;
};

export type StoredUserAiRephraseStyleOverride = {
  encryptedPrompt: string;
  keyVersion: string;
  styleId: string;
  updatedAt: Date;
};

export type WorkspaceAiRephraseStyleInput = {
  encryptedPrompt: string | null;
  workspaceId: string;
  keyVersion: string;
  label: string;
  sortOrder: number;
};

export type UpdateWorkspaceAiRephraseStyleInput = {
  encryptedPrompt: string | null;
  workspaceId: string;
  isEnabled: boolean;
  keyVersion: string;
  label: string;
  styleId: string;
};

export type UpsertUserAiRephraseStyleOverrideInput = {
  encryptedPrompt: string;
  workspaceId: string;
  keyVersion: string;
  styleId: string;
  userId: string;
};

export type AiRephraseStyleRepository = {
  createWorkspaceStyle(
    input: WorkspaceAiRephraseStyleInput,
  ): Promise<StoredWorkspaceAiRephraseStyle>;
  deleteUserStyleOverride(input: {
    workspaceId: string;
    styleId: string;
    userId: string;
  }): Promise<void>;
  deleteWorkspaceStyle(input: {
    workspaceId: string;
    styleId: string;
  }): Promise<void>;
  getUserStyleOverride(input: {
    workspaceId: string;
    styleId: string;
    userId: string;
  }): Promise<StoredUserAiRephraseStyleOverride | null>;
  getWorkspaceStyle(input: {
    workspaceId: string;
    styleId: string;
  }): Promise<StoredWorkspaceAiRephraseStyle | null>;
  listUserStyleOverrides(input: {
    workspaceId: string;
    userId: string;
  }): Promise<StoredUserAiRephraseStyleOverride[]>;
  listWorkspaceStyles(
    workspaceId: string,
  ): Promise<StoredWorkspaceAiRephraseStyle[]>;
  updateWorkspaceStyle(
    input: UpdateWorkspaceAiRephraseStyleInput,
  ): Promise<StoredWorkspaceAiRephraseStyle | null>;
  updateWorkspaceStyleOrder(input: {
    workspaceId: string;
    orderedStyleIds: string[];
  }): Promise<void>;
  upsertUserStyleOverride(
    input: UpsertUserAiRephraseStyleOverrideInput,
  ): Promise<void>;
};

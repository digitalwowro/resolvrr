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
  helpdeskConnectionId: string;
  keyVersion: string;
  label: string;
  sortOrder: number;
};

export type UpdateWorkspaceAiRephraseStyleInput = {
  encryptedPrompt: string | null;
  helpdeskConnectionId: string;
  isEnabled: boolean;
  keyVersion: string;
  label: string;
  styleId: string;
};

export type UpsertUserAiRephraseStyleOverrideInput = {
  encryptedPrompt: string;
  helpdeskConnectionId: string;
  keyVersion: string;
  styleId: string;
  userId: string;
};

export type AiRephraseStyleRepository = {
  createWorkspaceStyle(
    input: WorkspaceAiRephraseStyleInput,
  ): Promise<StoredWorkspaceAiRephraseStyle>;
  deleteUserStyleOverride(input: {
    helpdeskConnectionId: string;
    styleId: string;
    userId: string;
  }): Promise<void>;
  deleteWorkspaceStyle(input: {
    helpdeskConnectionId: string;
    styleId: string;
  }): Promise<void>;
  getUserStyleOverride(input: {
    helpdeskConnectionId: string;
    styleId: string;
    userId: string;
  }): Promise<StoredUserAiRephraseStyleOverride | null>;
  getWorkspaceStyle(input: {
    helpdeskConnectionId: string;
    styleId: string;
  }): Promise<StoredWorkspaceAiRephraseStyle | null>;
  listUserStyleOverrides(input: {
    helpdeskConnectionId: string;
    userId: string;
  }): Promise<StoredUserAiRephraseStyleOverride[]>;
  listWorkspaceStyles(
    helpdeskConnectionId: string,
  ): Promise<StoredWorkspaceAiRephraseStyle[]>;
  updateWorkspaceStyle(
    input: UpdateWorkspaceAiRephraseStyleInput,
  ): Promise<StoredWorkspaceAiRephraseStyle | null>;
  updateWorkspaceStyleOrder(input: {
    helpdeskConnectionId: string;
    orderedStyleIds: string[];
  }): Promise<void>;
  upsertUserStyleOverride(
    input: UpsertUserAiRephraseStyleOverrideInput,
  ): Promise<void>;
};

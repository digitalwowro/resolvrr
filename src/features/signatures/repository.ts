import type { TicketSignatureSource } from "@/core/ticket-signatures";

export type StoredWorkspaceSignatureTemplate = {
  contextVersion: string;
  encryptedBodyHtml: string;
  groupExternalId?: string;
  id: string;
  keyVersion: string;
};

export type StoredWorkspaceSignatureConfiguration = {
  contextVersion: string;
  source: TicketSignatureSource;
  templates: StoredWorkspaceSignatureTemplate[];
  workspaceDisplayName: string;
};

export type WorkspaceSignatureUser = {
  displayName?: string;
  email: string;
  firstName?: string;
  lastName?: string;
};

export type WorkspaceSignatureRepository = {
  deleteTemplate(workspaceId: string, groupExternalId?: string): Promise<boolean>;
  getConfiguration(workspaceId: string): Promise<StoredWorkspaceSignatureConfiguration | null>;
  getUser(userId: string): Promise<WorkspaceSignatureUser | null>;
  setSource(workspaceId: string, source: TicketSignatureSource): Promise<void>;
  upsertTemplate(input: {
    contextVersion: string;
    createdByUserId: string;
    encryptedBodyHtml: string;
    groupExternalId?: string;
    keyVersion: string;
    workspaceId: string;
  }): Promise<void>;
};

export const noWorkspaceSignatureRepository: WorkspaceSignatureRepository = {
  async deleteTemplate() { return false; },
  async getConfiguration() {
    return {
      contextVersion: "signature-none-v1",
      source: "none",
      templates: [],
      workspaceDisplayName: "Workspace",
    };
  },
  async getUser() { return null; },
  async setSource() {},
  async upsertTemplate() {},
};

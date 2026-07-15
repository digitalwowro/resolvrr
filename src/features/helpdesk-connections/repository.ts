import type { HelpdeskConnectionStatus } from "@/core/helpdesk-connections";

export const activeWorkspacePreferenceKey = "activeWorkspaceId";

export type WorkspaceAccessRole = "ADMIN" | "AGENT";

export type WorkspaceAccess = {
  canEditAiRephraseStyleOverrides: boolean;
  canEditMyStyle: boolean;
  role: WorkspaceAccessRole;
};

export type WorkspaceUserAiPermissions = Pick<
  WorkspaceAccess,
  "canEditAiRephraseStyleOverrides" | "canEditMyStyle"
>;

export type StoredProviderCredential = {
  scheme: string;
  encryptedPayload: string;
  keyVersion: string;
};

export type StoredWorkspace = {
  id: string;
  ownerUserId: string;
  providerKey: string;
  displayName: string;
  baseUrl: string;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredHelpdeskConnection = {
  id: string;
  workspaceId: string;
  userId: string;
  status: HelpdeskConnectionStatus;
  providerIdentityExternalId: string | null;
  providerIdentityDisplayName: string | null;
  identityVersion: string;
  createdAt: Date;
  updatedAt: Date;
};

export type AccessibleWorkspace = StoredWorkspace & {
  access: WorkspaceAccess;
  connection: StoredHelpdeskConnection | null;
};

export type HelpdeskConnectionWithCredential = StoredHelpdeskConnection & {
  providerKey: string;
  displayName: string;
  baseUrl: string;
  workspace: StoredWorkspace;
  access: WorkspaceAccess;
  credential: StoredProviderCredential | null;
};

export type CreateWorkspaceConnectionInput = {
  userId: string;
  providerKey: string;
  displayName: string;
  baseUrl: string;
  credentialScheme: string;
  encryptedCredentialPayload: string;
  providerIdentityExternalId: string;
  providerIdentityDisplayName: string;
};

export type UpdatePersonalConnectionInput = {
  connectionId: string;
  userId: string;
  credentialScheme?: string;
  encryptedCredentialPayload?: string;
  providerIdentityExternalId?: string;
  providerIdentityDisplayName?: string;
  status?: HelpdeskConnectionStatus;
  rotateIdentityVersion?: boolean;
};

export type CreatePersonalConnectionInput = {
  workspaceId: string;
  userId: string;
  credentialScheme: string;
  encryptedCredentialPayload: string;
  providerIdentityExternalId: string;
  providerIdentityDisplayName: string;
};

export type HelpdeskConnectionsRepository = {
  getAccess(userId: string, workspaceId: string): Promise<WorkspaceAccess | null>;
  listForUser(userId: string): Promise<AccessibleWorkspace[]>;
  findWorkspaceForUser(userId: string, workspaceId: string): Promise<AccessibleWorkspace | null>;
  findForUser(userId: string, connectionId: string): Promise<HelpdeskConnectionWithCredential | null>;
  findForUserWorkspace(userId: string, workspaceId: string): Promise<HelpdeskConnectionWithCredential | null>;
  create(input: CreateWorkspaceConnectionInput): Promise<AccessibleWorkspace>;
  createPersonalConnection(input: CreatePersonalConnectionInput): Promise<HelpdeskConnectionWithCredential | "identity-taken" | null>;
  updatePersonalConnection(input: UpdatePersonalConnectionInput): Promise<HelpdeskConnectionWithCredential | "identity-taken" | null>;
  updateWorkspace(input: { userId: string; workspaceId: string; displayName: string; baseUrl: string }): Promise<AccessibleWorkspace | null>;
  updateStatus(userId: string, connectionId: string, status: HelpdeskConnectionStatus): Promise<boolean>;
  deleteForUser(userId: string, connectionId: string): Promise<boolean>;
  getActiveWorkspaceId(userId: string): Promise<string | null>;
  setActiveWorkspaceId(userId: string, workspaceId: string): Promise<void>;
  clearActiveWorkspaceId(userId: string): Promise<void>;
  updateWorkspaceAgentAiPermissions(workspaceId: string, permissions: WorkspaceUserAiPermissions): Promise<void>;
  /** Transitional test-double compatibility; production code must use the split methods. */
  update?: (input: Record<string, unknown>) => Promise<HelpdeskConnectionWithCredential | null>;
};

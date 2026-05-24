import type { HelpdeskConnectionStatus } from "@/core/helpdesk-connections";

export const activeConnectionPreferenceKey = "activeConnectionId";

export type StoredHelpdeskConnection = {
  id: string;
  userId: string;
  providerKey: string;
  displayName: string;
  baseUrl: string;
  status: HelpdeskConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
};

export type StoredProviderCredential = {
  scheme: string;
  encryptedPayload: string;
  keyVersion: string;
};

export type HelpdeskConnectionWithCredential = StoredHelpdeskConnection & {
  credential: StoredProviderCredential | null;
};

export type CreateHelpdeskConnectionInput = {
  userId: string;
  providerKey: string;
  displayName: string;
  baseUrl: string;
  status: HelpdeskConnectionStatus;
  credentialScheme: string;
  encryptedCredentialPayload: string;
};

export type UpdateHelpdeskConnectionInput = {
  id: string;
  userId: string;
  displayName: string;
  baseUrl: string;
  status?: HelpdeskConnectionStatus;
  credentialScheme?: string;
  encryptedCredentialPayload?: string;
};

export type HelpdeskConnectionsRepository = {
  listForUser(userId: string): Promise<StoredHelpdeskConnection[]>;
  findForUser(
    userId: string,
    connectionId: string,
  ): Promise<HelpdeskConnectionWithCredential | null>;
  create(input: CreateHelpdeskConnectionInput): Promise<StoredHelpdeskConnection>;
  update(
    input: UpdateHelpdeskConnectionInput,
  ): Promise<StoredHelpdeskConnection | null>;
  updateStatus(
    userId: string,
    connectionId: string,
    status: HelpdeskConnectionStatus,
  ): Promise<boolean>;
  deleteForUser(userId: string, connectionId: string): Promise<boolean>;
  getActiveConnectionId(userId: string): Promise<string | null>;
  setActiveConnectionId(userId: string, connectionId: string): Promise<void>;
  clearActiveConnectionId(userId: string): Promise<void>;
};

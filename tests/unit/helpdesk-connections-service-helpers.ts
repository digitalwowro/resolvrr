import { vi } from "vitest";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import { encryptSecret } from "@/security/encryption";
import type {
  AccessibleWorkspace,
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";

export const key = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

const access: WorkspaceAccess = {
  canEditAiRephraseStyleOverrides: false,
  canEditMyStyle: true,
  role: "ADMIN",
};

export function form(values: Record<string, string>): FormData {
  const data = new FormData();
  Object.entries(values).forEach(([name, value]) => data.set(name, value));
  return data;
}

export function connection(
  overrides: Partial<HelpdeskConnectionWithCredential> = {},
): HelpdeskConnectionWithCredential {
  const createdAt = new Date("2026-01-01T00:00:00.000Z");
  const workspace = {
    id: "workspace_1",
    ownerUserId: "user_1",
    providerKey: "example",
    displayName: "Support",
    baseUrl: "https://93.184.216.34",
    createdAt,
    updatedAt: createdAt,
  };
  return {
    id: "conn_1",
    workspaceId: workspace.id,
    userId: "user_1",
    providerKey: workspace.providerKey,
    displayName: workspace.displayName,
    baseUrl: workspace.baseUrl,
    status: "active",
    providerIdentityExternalId: "agent-1",
    providerIdentityDisplayName: "Agent One",
    identityVersion: "identity-v1",
    createdAt,
    updatedAt: createdAt,
    workspace,
    access,
    credential: {
      scheme: "basic-auth",
      encryptedPayload: encryptSecret(
        JSON.stringify({ username: "agent", password: "secret" }),
        key,
      ),
      keyVersion: "v1",
    },
    ...overrides,
  } as HelpdeskConnectionWithCredential;
}

function accessible(row: HelpdeskConnectionWithCredential): AccessibleWorkspace {
  return { ...row.workspace, access: row.access, connection: row };
}

export function repository(
  seed: HelpdeskConnectionWithCredential[] = [],
  options: { personalUpdateResult?: "identity-taken" } = {},
) {
  const rows = new Map(seed.map((row) => [row.id, row]));
  let activeWorkspaceId: string | null = null;
  let lastCreated: HelpdeskConnectionWithCredential | null = null;
  let lastUpdate: Record<string, unknown> | null = null;

  const repo: HelpdeskConnectionsRepository = {
    async listForUser(userId) {
      return [...rows.values()].filter((row) => row.userId === userId).map(accessible);
    },
    async findForUser(userId, connectionId) {
      const row = rows.get(connectionId);
      return row?.userId === userId ? row : null;
    },
    async findForUserWorkspace(userId, workspaceId) {
      return [...rows.values()].find(
        (row) => row.userId === userId && row.workspaceId === workspaceId,
      ) ?? null;
    },
    async findWorkspaceForUser(userId, workspaceId) {
      const row = await this.findForUserWorkspace(userId, workspaceId);
      return row ? accessible(row) : null;
    },
    async getAccess(userId, workspaceId) {
      return (await this.findForUserWorkspace(userId, workspaceId))?.access ?? null;
    },
    async create(input) {
      const row = connection({
        id: "created-connection",
        workspaceId: "created-workspace",
        userId: input.userId,
        providerIdentityExternalId: input.providerIdentityExternalId,
        providerIdentityDisplayName: input.providerIdentityDisplayName,
        workspace: {
          id: "created-workspace",
          ownerUserId: input.userId,
          providerKey: input.providerKey,
          displayName: input.displayName,
          baseUrl: input.baseUrl,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        providerKey: input.providerKey,
        displayName: input.displayName,
        baseUrl: input.baseUrl,
        credential: {
          scheme: input.credentialScheme,
          encryptedPayload: input.encryptedCredentialPayload,
          keyVersion: "v1",
        },
      });
      rows.set(row.id, row);
      lastCreated = row;
      return accessible(row);
    },
    async createPersonalConnection() { return null; },
    async updatePersonalConnection(input) {
      if (options.personalUpdateResult) return options.personalUpdateResult;
      const row = rows.get(input.connectionId);
      if (!row || row.userId !== input.userId) return null;
      lastUpdate = input as unknown as Record<string, unknown>;
      const updated = connection({
        ...row,
        status: input.status ?? row.status,
        providerIdentityExternalId:
          input.providerIdentityExternalId ?? row.providerIdentityExternalId,
        providerIdentityDisplayName:
          input.providerIdentityDisplayName ?? row.providerIdentityDisplayName,
        credential: input.encryptedCredentialPayload && input.credentialScheme
          ? { scheme: input.credentialScheme, encryptedPayload: input.encryptedCredentialPayload, keyVersion: "v1" }
          : row.credential,
      });
      rows.set(row.id, updated);
      return updated;
    },
    async updateWorkspace(input) {
      const row = await this.findForUserWorkspace(input.userId, input.workspaceId);
      if (!row) return null;
      lastUpdate = input as unknown as Record<string, unknown>;
      const workspace = { ...row.workspace, displayName: input.displayName, baseUrl: input.baseUrl };
      const updated = connection({ ...row, workspace, displayName: input.displayName, baseUrl: input.baseUrl });
      rows.set(row.id, updated);
      return accessible(updated);
    },
    async updateStatus(userId, connectionId, status) {
      const row = rows.get(connectionId);
      if (!row || row.userId !== userId) return false;
      rows.set(connectionId, connection({ ...row, status }));
      return true;
    },
    async deleteForUser(userId, connectionId) {
      const row = rows.get(connectionId);
      return row?.userId === userId ? rows.delete(connectionId) : false;
    },
    async getActiveWorkspaceId() { return activeWorkspaceId; },
    async setActiveWorkspaceId(_userId, workspaceId) { activeWorkspaceId = workspaceId; },
    async clearActiveWorkspaceId() { activeWorkspaceId = null; },
    async updateWorkspaceAgentAiPermissions() {},
  };

  return {
    repo,
    get activeConnectionId() { return activeWorkspaceId; },
    get lastCreated() { return lastCreated; },
    get lastUpdate() { return lastUpdate; },
  };
}

export function registry(
  validateConnection = vi.fn().mockResolvedValue({
    externalId: "agent-1",
    displayName: "Agent One",
  }),
) {
  const plugin: HelpdeskProviderPlugin = {
    key: "example",
    label: "Example",
    capabilities: [],
    credentialSchemes: [{
      key: "basic-auth",
      label: "Basic Auth",
      fields: [
        { name: "username", label: "Username", type: "text", required: true },
        { name: "password", label: "Password", type: "password", required: true },
      ],
    }],
    validateConnection,
    listTickets: async () => ({ tickets: [], loadedCount: 0, measuredAt: new Date() }),
    getTicketDetail: async () => { throw new ProviderError("unsupported-capability", "Not implemented"); },
  };
  return { validateConnection, registry: createProviderRegistry([plugin]) };
}

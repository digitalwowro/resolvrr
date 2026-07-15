import type {
  HelpdeskConnectionsRepository,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";

export const defaultWorkspaceAccess: WorkspaceAccess = {
  canEditAiRephraseStyleOverrides: false,
  canEditMyStyle: true,
  role: "AGENT",
};

export function connectionRepository(
  access: WorkspaceAccess = defaultWorkspaceAccess,
): HelpdeskConnectionsRepository {
  return {
    async clearActiveWorkspaceId() {},
    async create() { throw new Error("not used"); },
    async createPersonalConnection() { return null; },
    async deleteForUser() { return false; },
    async findForUser(userId, connectionId) {
      const createdAt = new Date("2026-06-01T00:00:00Z");
      const workspace = {
        id: connectionId,
        ownerUserId: userId,
        providerKey: "example",
        displayName: "Support",
        baseUrl: "https://helpdesk.example.com",
        createdAt,
        updatedAt: createdAt,
      };
      return {
        ...workspace,
        access,
        credential: null,
        id: connectionId,
        identityVersion: "identity-v1",
        providerIdentityExternalId: "agent-1",
        providerIdentityDisplayName: "Agent One",
        status: "active",
        userId,
        workspace,
        workspaceId: connectionId,
      };
    },
    async findForUserWorkspace(userId, workspaceId) {
      return this.findForUser(userId, workspaceId);
    },
    async findWorkspaceForUser(userId, workspaceId) {
      const connection = await this.findForUser(userId, workspaceId);
      return connection
        ? { ...connection.workspace, access, connection: null }
        : null;
    },
    async getAccess() { return access; },
    async getActiveWorkspaceId() { return "connection-1"; },
    async listForUser() { return []; },
    async setActiveWorkspaceId() {},
    async updatePersonalConnection() { return null; },
    async updateWorkspace() { return null; },
    async updateWorkspaceAgentAiPermissions() {},
    async updateStatus() { return false; },
  };
}

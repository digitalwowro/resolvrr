import { prisma } from "@/data/prisma";
import { builtInRephraseStyles } from "@/features/ai/rephrase-style-defaults";
import {
  activeConnectionPreferenceKey,
  type HelpdeskConnectionWithCredential,
  type HelpdeskConnectionsRepository,
  type UpdateHelpdeskConnectionInput,
} from "@/features/helpdesk-connections/repository";
import {
  connectionSelect,
  findWorkspaceAccess,
  toDbStatus,
  toStoredConnection,
} from "./helpdesk-connections-repository-mappers";

export const prismaHelpdeskConnectionsRepository: HelpdeskConnectionsRepository = {
  async getAccess(userId, connectionId) {
    return findWorkspaceAccess(userId, connectionId);
  },

  async listForUser(userId) {
    const connections = await prisma.helpdeskConnection.findMany({
      where: {
        memberships: {
          some: { userId },
        },
      },
      orderBy: [{ createdAt: "desc" }, { displayName: "asc" }],
      select: connectionSelect,
    });

    return connections.map(toStoredConnection);
  },

  async findForUser(userId, connectionId) {
    const connection = await prisma.helpdeskConnection.findFirst({
      where: {
        id: connectionId,
        memberships: {
          some: { userId },
        },
      },
      select: {
        ...connectionSelect,
        credentials: {
          select: {
            scheme: true,
            encryptedPayload: true,
            keyVersion: true,
          },
          take: 1,
        },
      },
    });

    if (!connection) {
      return null;
    }
    const access = await findWorkspaceAccess(userId, connectionId);
    if (!access) {
      return null;
    }

    return {
      ...toStoredConnection(connection),
      access,
      credential: connection.credentials[0] ?? null,
    } satisfies HelpdeskConnectionWithCredential;
  },

  async create(input) {
    const connection = await prisma.$transaction(async (transaction) => {
      const created = await transaction.helpdeskConnection.create({
        data: {
          userId: input.userId,
          providerKey: input.providerKey,
          displayName: input.displayName,
          baseUrl: input.baseUrl,
          status: toDbStatus(input.status),
          credentials: {
            create: {
              scheme: input.credentialScheme,
              encryptedPayload: input.encryptedCredentialPayload,
            },
          },
        },
        select: connectionSelect,
      });
      await transaction.workspaceMembership.create({
        data: {
          canEditAiRephraseStyleOverrides: true,
          canEditMyStyle: true,
          helpdeskConnectionId: created.id,
          role: "ADMIN",
          userId: input.userId,
        },
      });
      await transaction.workspaceAiRephraseStyle.createMany({
        data: builtInRephraseStyles.map((style) => ({
          helpdeskConnectionId: created.id,
          label: style.label,
          seedKey: style.seedKey,
          sortOrder: style.sortOrder,
        })),
      });
      return created;
    });

    return toStoredConnection(connection);
  },

  async update(input: UpdateHelpdeskConnectionInput) {
    const access = await findWorkspaceAccess(input.userId, input.id);
    if (access?.role !== "ADMIN") {
      return null;
    }

    const connection = await prisma.helpdeskConnection.update({
      where: { id: input.id },
      data: {
        displayName: input.displayName,
        baseUrl: input.baseUrl,
        status: input.status ? toDbStatus(input.status) : undefined,
        credentials:
          input.credentialScheme && input.encryptedCredentialPayload
            ? {
                upsert: {
                  where: {
                    helpdeskConnectionId_scheme: {
                      helpdeskConnectionId: input.id,
                      scheme: input.credentialScheme,
                    },
                  },
                  create: {
                    scheme: input.credentialScheme,
                    encryptedPayload: input.encryptedCredentialPayload,
                  },
                  update: {
                    encryptedPayload: input.encryptedCredentialPayload,
                  },
                },
              }
            : undefined,
      },
      select: connectionSelect,
    });

    return toStoredConnection(connection);
  },

  async updateStatus(userId, connectionId, status) {
    const access = await findWorkspaceAccess(userId, connectionId);
    if (access?.role !== "ADMIN") {
      return false;
    }
    const result = await prisma.helpdeskConnection.updateMany({
      where: { id: connectionId },
      data: { status: toDbStatus(status) },
    });

    return result.count === 1;
  },

  async updateWorkspaceAgentAiPermissions(connectionId, permissions) {
    await prisma.workspaceMembership.updateMany({
      where: {
        helpdeskConnectionId: connectionId,
        role: "AGENT",
      },
      data: {
        canEditAiRephraseStyleOverrides:
          permissions.canEditAiRephraseStyleOverrides,
        canEditMyStyle: permissions.canEditMyStyle,
      },
    });
  },

  async deleteForUser(userId, connectionId) {
    const access = await findWorkspaceAccess(userId, connectionId);
    if (access?.role !== "ADMIN") {
      return false;
    }
    const result = await prisma.helpdeskConnection.deleteMany({
      where: { id: connectionId },
    });

    return result.count === 1;
  },

  async getActiveConnectionId(userId) {
    const preference = await prisma.uiPreference.findFirst({
      where: {
        userId,
        helpdeskConnectionId: null,
        key: activeConnectionPreferenceKey,
      },
      select: { valueJson: true },
    });

    return typeof preference?.valueJson === "string"
      ? preference.valueJson
      : null;
  },

  async setActiveConnectionId(userId, connectionId) {
    await prisma.$transaction([
      prisma.uiPreference.deleteMany({
        where: {
          userId,
          helpdeskConnectionId: null,
          key: activeConnectionPreferenceKey,
        },
      }),
      prisma.uiPreference.create({
        data: {
          userId,
          key: activeConnectionPreferenceKey,
          valueJson: connectionId,
        },
      }),
    ]);
  },

  async clearActiveConnectionId(userId) {
    await prisma.uiPreference.deleteMany({
      where: {
        userId,
        helpdeskConnectionId: null,
        key: activeConnectionPreferenceKey,
      },
    });
  },
};

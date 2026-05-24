import { HelpdeskConnectionStatus as DbConnectionStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import type { HelpdeskConnectionStatus } from "@/core/helpdesk-connections";
import {
  activeConnectionPreferenceKey,
  type HelpdeskConnectionWithCredential,
  type HelpdeskConnectionsRepository,
  type StoredHelpdeskConnection,
  type UpdateHelpdeskConnectionInput,
} from "@/features/helpdesk-connections/repository";

const connectionSelect = {
  id: true,
  userId: true,
  providerKey: true,
  displayName: true,
  baseUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HelpdeskConnectionSelect;

function toDbStatus(status: HelpdeskConnectionStatus): DbConnectionStatus {
  if (status === "auth_failed") {
    return DbConnectionStatus.AUTH_FAILED;
  }
  if (status === "disconnected") {
    return DbConnectionStatus.DISCONNECTED;
  }
  return DbConnectionStatus.ACTIVE;
}

function toDomainStatus(status: DbConnectionStatus): HelpdeskConnectionStatus {
  if (status === DbConnectionStatus.AUTH_FAILED) {
    return "auth_failed";
  }
  if (status === DbConnectionStatus.DISCONNECTED) {
    return "disconnected";
  }
  return "active";
}

function toStoredConnection(connection: {
  id: string;
  userId: string;
  providerKey: string;
  displayName: string;
  baseUrl: string;
  status: DbConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}): StoredHelpdeskConnection {
  return {
    ...connection,
    status: toDomainStatus(connection.status),
  };
}

export const prismaHelpdeskConnectionsRepository: HelpdeskConnectionsRepository = {
  async listForUser(userId) {
    const connections = await prisma.helpdeskConnection.findMany({
      where: { userId },
      orderBy: [{ createdAt: "desc" }, { displayName: "asc" }],
      select: connectionSelect,
    });

    return connections.map(toStoredConnection);
  },

  async findForUser(userId, connectionId) {
    const connection = await prisma.helpdeskConnection.findFirst({
      where: { id: connectionId, userId },
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

    return {
      ...toStoredConnection(connection),
      credential: connection.credentials[0] ?? null,
    } satisfies HelpdeskConnectionWithCredential;
  },

  async create(input) {
    const connection = await prisma.helpdeskConnection.create({
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

    return toStoredConnection(connection);
  },

  async update(input: UpdateHelpdeskConnectionInput) {
    const existing = await prisma.helpdeskConnection.findFirst({
      where: { id: input.id, userId: input.userId },
      select: { id: true },
    });
    if (!existing) {
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
    const result = await prisma.helpdeskConnection.updateMany({
      where: { id: connectionId, userId },
      data: { status: toDbStatus(status) },
    });

    return result.count === 1;
  },

  async deleteForUser(userId, connectionId) {
    const result = await prisma.helpdeskConnection.deleteMany({
      where: { id: connectionId, userId },
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

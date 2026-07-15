import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import { builtInRephraseStyles } from "@/features/ai/rephrase-style-defaults";
import {
  activeWorkspacePreferenceKey,
  type AccessibleWorkspace,
  type HelpdeskConnectionWithCredential,
  type HelpdeskConnectionsRepository,
} from "@/features/helpdesk-connections/repository";
import {
  connectionSelect,
  toDbStatus,
  toStoredConnection,
  toStoredWorkspace,
  toWorkspaceAccess,
  workspaceSelect,
} from "./helpdesk-connections-repository-mappers";

const accessSelect = {
  canEditAiRephraseStyleOverrides: true,
  canEditMyStyle: true,
  role: true,
} as const;

const accessibleWorkspaceSelect = (userId: string) => ({
  ...workspaceSelect,
  memberships: { where: { userId }, select: accessSelect, take: 1 },
  helpdeskConnections: {
    where: { userId }, select: connectionSelect, take: 1,
  },
});

function accessibleWorkspace(value: {
  id: string; ownerUserId: string; providerKey: string; displayName: string;
  baseUrl: string; createdAt: Date; updatedAt: Date;
  memberships: Array<{ canEditAiRephraseStyleOverrides: boolean; canEditMyStyle: boolean; role: "ADMIN" | "AGENT" }>;
  helpdeskConnections: Array<Parameters<typeof toStoredConnection>[0]>;
}): AccessibleWorkspace {
  const access = value.memberships[0];
  if (!access) throw new Error("Accessible workspace is missing its membership.");
  const { memberships: _memberships, helpdeskConnections, ...workspace } = value;
  void _memberships;
  return {
    ...toStoredWorkspace(workspace),
    access: toWorkspaceAccess(access),
    connection: helpdeskConnections[0]
      ? toStoredConnection(helpdeskConnections[0])
      : null,
  };
}

async function connectionWithCredential(
  userId: string,
  where: { id?: string; workspaceId?: string },
): Promise<HelpdeskConnectionWithCredential | null> {
  const row = await prisma.helpdeskConnection.findFirst({
    where: {
      ...where,
      userId,
      workspace: { memberships: { some: { userId } } },
    },
    select: {
      ...connectionSelect,
      workspace: {
        select: {
          ...workspaceSelect,
          memberships: { where: { userId }, select: accessSelect, take: 1 },
        },
      },
      credentials: {
        select: { scheme: true, encryptedPayload: true, keyVersion: true },
        take: 1,
      },
    },
  });
  const access = row?.workspace.memberships[0];
  if (!row || !access) return null;
  const { credentials, workspace, ...connection } = row;
  const { memberships: _memberships, ...storedWorkspace } = workspace;
  void _memberships;
  return {
    ...toStoredConnection(connection),
    providerKey: storedWorkspace.providerKey,
    displayName: storedWorkspace.displayName,
    baseUrl: storedWorkspace.baseUrl,
    workspace: toStoredWorkspace(storedWorkspace),
    access: toWorkspaceAccess(access),
    credential: credentials[0] ?? null,
  };
}

export const prismaHelpdeskConnectionsRepository: HelpdeskConnectionsRepository = {
  async getAccess(userId, workspaceId) {
    const membership = await prisma.workspaceMembership.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: accessSelect,
    });
    return membership ? toWorkspaceAccess(membership) : null;
  },
  async listForUser(userId) {
    const rows = await prisma.workspace.findMany({
      where: { memberships: { some: { userId } } },
      orderBy: [{ createdAt: "desc" }, { displayName: "asc" }],
      select: accessibleWorkspaceSelect(userId),
    });
    return rows.map(accessibleWorkspace);
  },
  async findWorkspaceForUser(userId, workspaceId) {
    const row = await prisma.workspace.findFirst({
      where: { id: workspaceId, memberships: { some: { userId } } },
      select: accessibleWorkspaceSelect(userId),
    });
    return row ? accessibleWorkspace(row) : null;
  },
  findForUser(userId, connectionId) {
    return connectionWithCredential(userId, { id: connectionId });
  },
  findForUserWorkspace(userId, workspaceId) {
    return connectionWithCredential(userId, { workspaceId });
  },
  async create(input) {
    const workspace = await prisma.$transaction(async (tx) => {
      const created = await tx.workspace.create({
        data: {
          ownerUserId: input.userId,
          providerKey: input.providerKey,
          displayName: input.displayName,
          baseUrl: input.baseUrl,
        },
        select: workspaceSelect,
      });
      await tx.workspaceMembership.create({
        data: {
          userId: input.userId, workspaceId: created.id, role: "ADMIN",
          canEditAiRephraseStyleOverrides: true, canEditMyStyle: true,
        },
      });
      await tx.helpdeskConnection.create({
        data: {
          workspaceId: created.id, userId: input.userId, status: "ACTIVE",
          providerIdentityExternalId: input.providerIdentityExternalId,
          providerIdentityDisplayName: input.providerIdentityDisplayName,
          credentials: { create: {
            scheme: input.credentialScheme,
            encryptedPayload: input.encryptedCredentialPayload,
          } },
        },
      });
      await tx.workspaceAiRephraseStyle.createMany({
        data: builtInRephraseStyles.map((style) => ({
          workspaceId: created.id, label: style.label, seedKey: style.seedKey,
          sortOrder: style.sortOrder,
        })),
      });
      return created;
    });
    const value = await this.findWorkspaceForUser(input.userId, workspace.id);
    if (!value) throw new Error("Created workspace could not be reloaded.");
    return value;
  },

  async createPersonalConnection(input) {
    const access = await this.getAccess(input.userId, input.workspaceId);
    if (!access) return null;
    try {
      const created = await prisma.helpdeskConnection.create({
        data: {
          workspaceId: input.workspaceId,
          userId: input.userId,
          status: "ACTIVE",
          providerIdentityExternalId: input.providerIdentityExternalId,
          providerIdentityDisplayName: input.providerIdentityDisplayName,
          credentials: {
            create: {
              scheme: input.credentialScheme,
              encryptedPayload: input.encryptedCredentialPayload,
            },
          },
        },
        select: { id: true },
      });
      return connectionWithCredential(input.userId, { id: created.id });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return "identity-taken";
      }
      throw error;
    }
  },

  async updatePersonalConnection(input) {
    const existing = await connectionWithCredential(input.userId, { id: input.connectionId });
    if (!existing) return null;
    try {
      await prisma.helpdeskConnection.update({
        where: { id: input.connectionId },
        data: {
          status: input.status ? toDbStatus(input.status) : undefined,
          ...(input.providerIdentityExternalId !== undefined
            ? { providerIdentityExternalId: input.providerIdentityExternalId }
            : {}),
          ...(input.providerIdentityDisplayName !== undefined
            ? { providerIdentityDisplayName: input.providerIdentityDisplayName }
            : {}),
          identityVersion: input.rotateIdentityVersion ? randomUUID() : undefined,
          credentials: input.credentialScheme && input.encryptedCredentialPayload
            ? { upsert: {
                where: { helpdeskConnectionId_scheme: {
                  helpdeskConnectionId: input.connectionId,
                  scheme: input.credentialScheme,
                } },
                create: { scheme: input.credentialScheme, encryptedPayload: input.encryptedCredentialPayload },
                update: { encryptedPayload: input.encryptedCredentialPayload },
              } }
            : undefined,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        return "identity-taken";
      }
      throw error;
    }
    return connectionWithCredential(input.userId, { id: input.connectionId });
  },

  async updateWorkspace(input) {
    const existing = await this.findWorkspaceForUser(input.userId, input.workspaceId);
    if (!existing || existing.access.role !== "ADMIN") return null;
    const canonicalChanged = existing.baseUrl !== input.baseUrl;
    await prisma.$transaction(async (tx) => {
      await tx.workspace.update({
        where: { id: input.workspaceId },
        data: { displayName: input.displayName, baseUrl: input.baseUrl },
      });
      if (!canonicalChanged) return;
      const connections = await tx.helpdeskConnection.findMany({
        where: { workspaceId: input.workspaceId }, select: { id: true },
      });
      const ids = connections.map((item) => item.id);
      await tx.providerCredential.deleteMany({ where: { helpdeskConnectionId: { in: ids } } });
      await Promise.all(connections.map((item) => tx.helpdeskConnection.update({
        where: { id: item.id },
        data: {
          status: "DISCONNECTED", providerIdentityExternalId: null,
          providerIdentityDisplayName: null, identityVersion: randomUUID(),
        },
      })));
      await tx.ticketSnapshotCache.deleteMany({ where: { helpdeskConnectionId: { in: ids } } });
      await tx.threadSnapshotCache.deleteMany({ where: { helpdeskConnectionId: { in: ids } } });
      await tx.aiSummaryCache.deleteMany({ where: { helpdeskConnectionId: { in: ids } } });
    });
    return this.findWorkspaceForUser(input.userId, input.workspaceId);
  },

  async updateStatus(userId, connectionId, status) {
    const result = await prisma.helpdeskConnection.updateMany({
      where: { id: connectionId, userId }, data: { status: toDbStatus(status) },
    });
    return result.count === 1;
  },

  async deleteForUser(userId, connectionId) {
    const result = await prisma.helpdeskConnection.deleteMany({ where: { id: connectionId, userId } });
    return result.count === 1;
  },

  async getActiveWorkspaceId(userId) {
    const preference = await prisma.uiPreference.findFirst({
      where: { userId, workspaceId: null, key: activeWorkspacePreferenceKey },
      select: { valueJson: true },
    });
    return typeof preference?.valueJson === "string" ? preference.valueJson : null;
  },

  async setActiveWorkspaceId(userId, workspaceId) {
    await prisma.$transaction(async (tx) => {
      await tx.uiPreference.deleteMany({
        where: { userId, workspaceId: null, key: activeWorkspacePreferenceKey },
      });
      await tx.uiPreference.create({
        data: { userId, key: activeWorkspacePreferenceKey, valueJson: workspaceId },
      });
    });
  },

  async clearActiveWorkspaceId(userId) {
    await prisma.uiPreference.deleteMany({
      where: { userId, workspaceId: null, key: activeWorkspacePreferenceKey },
    });
  },

  async updateWorkspaceAgentAiPermissions(workspaceId, permissions) {
    await prisma.workspaceMembership.updateMany({
      where: { workspaceId, role: "AGENT" }, data: permissions,
    });
  },
};

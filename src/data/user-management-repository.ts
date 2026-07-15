import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import type { ManagedUserRecord } from "@/features/user-management/repository";
import type {
  ManagedUserMembership,
  ManagedWorkspaceOption,
} from "@/features/user-management/model";
import type { UserManagementRepository } from "@/features/user-management/repository";

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  deactivatedAt: true,
  createdAt: true,
  workspaceMemberships: {
    select: {
      canEditAiRephraseStyleOverrides: true,
      canEditMyStyle: true,
      workspaceId: true,
      role: true,
    },
    orderBy: { createdAt: "asc" },
  },
  helpdeskConnections: {
    select: { workspaceId: true, status: true },
  },
  ownedWorkspaces: { select: { id: true } },
  _count: {
    select: { providerMutationLogs: true },
  },
} satisfies Prisma.UserSelect;

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

function toMembership(
  membership: ManagedUserMembership,
  connectionStatus?: "ACTIVE" | "AUTH_FAILED" | "DISCONNECTED",
): ManagedUserMembership {
  return {
    canEditAiRephraseStyleOverrides:
      membership.canEditAiRephraseStyleOverrides,
    canEditMyStyle: membership.canEditMyStyle,
    workspaceId: membership.workspaceId,
    role: membership.role,
    connectionStatus: connectionStatus
      ? connectionStatus.toLowerCase() as "active" | "auth_failed" | "disconnected"
      : "not-connected",
  };
}

function toManagedUserRecord(user: Prisma.UserGetPayload<{ select: typeof userSelect }>): ManagedUserRecord {
  return {
    createdAt: user.createdAt.toISOString(),
    deactivatedAt: user.deactivatedAt?.toISOString() ?? null,
    email: user.email,
    firstName: user.firstName,
    hasProviderMutations: user._count.providerMutationLogs > 0,
    id: user.id,
    lastName: user.lastName,
    memberships: user.workspaceMemberships.map((membership) =>
      toMembership(
        membership,
        user.helpdeskConnections.find(
          (connection) => connection.workspaceId === membership.workspaceId,
        )?.status,
      ),
    ),
    ownedWorkspaceIds: user.ownedWorkspaces.map((workspace) => workspace.id),
    role: user.role,
  };
}

async function replaceMemberships(
  transaction: Prisma.TransactionClient,
  userId: string,
  memberships: ManagedUserMembership[],
) {
  const workspaceIds = memberships.map((membership) => membership.workspaceId);
  await transaction.helpdeskConnection.deleteMany({
    where: {
      userId,
      ...(workspaceIds.length > 0
        ? { workspaceId: { notIn: workspaceIds } }
        : {}),
    },
  });
  await transaction.workspaceMembership.deleteMany({ where: { userId } });
  if (memberships.length === 0) {
    return;
  }
  await transaction.workspaceMembership.createMany({
    data: memberships.map((membership) => ({
      canEditAiRephraseStyleOverrides:
        membership.canEditAiRephraseStyleOverrides,
      canEditMyStyle: membership.canEditMyStyle,
      workspaceId: membership.workspaceId,
      role: membership.role,
      userId,
    })),
  });
}

export const prismaUserManagementRepository: UserManagementRepository = {
  async createUser(input) {
    try {
      const user = await prisma.$transaction(async (transaction) => {
        const created = await transaction.user.create({
          data: {
            email: input.email,
            firstName: input.firstName,
            lastName: input.lastName,
            role: input.role,
            passwordLogin: {
              create: { passwordHash: input.passwordHash },
            },
          },
          select: { id: true },
        });
        await replaceMemberships(transaction, created.id, input.memberships);
        return created;
      });
      return user;
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return "email-taken";
      }
      throw error;
    }
  },

  async deleteUser(userId) {
    await prisma.user.delete({ where: { id: userId } });
  },

  async deleteUserPersonalData(userId) {
    await prisma.$transaction([
      prisma.passwordLogin.deleteMany({ where: { userId } }),
      prisma.session.deleteMany({ where: { userId } }),
      prisma.workspaceMembership.deleteMany({ where: { userId } }),
      prisma.helpdeskConnection.deleteMany({ where: { userId } }),
      prisma.userWorkspaceAiSetting.deleteMany({ where: { userId } }),
      prisma.workspaceMyStyle.deleteMany({ where: { userId } }),
      prisma.userAiRephraseStyleOverride.deleteMany({ where: { userId } }),
      prisma.uiPreference.deleteMany({ where: { userId } }),
      prisma.userSavedViewPreference.deleteMany({ where: { userId } }),
      prisma.savedView.deleteMany({ where: { ownerUserId: userId } }),
      prisma.ticketSnapshotCache.deleteMany({ where: { userId } }),
      prisma.threadSnapshotCache.deleteMany({ where: { userId } }),
      prisma.aiSummaryCache.deleteMany({ where: { userId } }),
    ]);
  },

  async getUserById(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: userSelect,
    });
    return user ? toManagedUserRecord(user) : null;
  },

  async listUsers() {
    const users = await prisma.user.findMany({
      orderBy: [{ deactivatedAt: "asc" }, { createdAt: "desc" }],
      select: userSelect,
    });
    return users.map(toManagedUserRecord);
  },

  async listWorkspaces(): Promise<ManagedWorkspaceOption[]> {
    const workspaces = await prisma.workspace.findMany({
      orderBy: [{ displayName: "asc" }, { createdAt: "asc" }],
      select: { displayName: true, id: true, ownerUserId: true },
    });
    return workspaces.map((workspace) => ({
      id: workspace.id,
      label: workspace.displayName,
      ownerUserId: workspace.ownerUserId,
    }));
  },

  async resetPassword(userId, passwordHash) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deactivatedAt: null },
      select: { id: true },
    });
    if (!user) {
      return false;
    }
    await prisma.$transaction([
      prisma.passwordLogin.upsert({
        where: { userId },
        create: { userId, passwordHash },
        update: { passwordHash },
      }),
      prisma.session.deleteMany({ where: { userId } }),
    ]);
    return true;
  },

  async scrubDeactivateUser(input) {
    await prisma.user.update({
      where: { id: input.userId },
      data: {
        avatarDataUrl: null,
        deactivatedAt: input.when,
        displayName: "Deleted user",
        email: input.email,
        firstName: null,
        lastName: null,
        role: "USER",
      },
    });
  },

  async transferOwnedWorkspaces(input) {
    const owned = await prisma.workspace.findMany({
      where: { ownerUserId: input.ownerUserId },
      select: { id: true },
    });
    if (owned.length === 0) {
      return "transferred";
    }
    const missing = owned.some((workspace) => !input.replacements[workspace.id]);
    if (missing) {
      return "replacement-owner-required";
    }
    const replacementIds = [...new Set(Object.values(input.replacements))];
    const replacements = await prisma.user.findMany({
      where: {
        deactivatedAt: null,
        id: { in: replacementIds, not: input.ownerUserId },
      },
      select: { id: true },
    });
    if (replacements.length !== replacementIds.length) {
      return "not-found";
    }
    await prisma.$transaction(
      owned.flatMap((workspace) => {
        const replacementUserId = input.replacements[workspace.id];
        return [
        prisma.workspace.update({
          where: { id: workspace.id },
          data: { ownerUserId: replacementUserId },
        }),
        prisma.workspaceMembership.upsert({
          where: { userId_workspaceId: { userId: replacementUserId, workspaceId: workspace.id } },
          create: {
            userId: replacementUserId, workspaceId: workspace.id, role: "ADMIN",
            canEditAiRephraseStyleOverrides: true, canEditMyStyle: true,
          },
          update: { role: "ADMIN" },
        }),
        ];
      }),
    );
    return "transferred";
  },

  async updateUser(input) {
    const user = await prisma.user.findFirst({
      where: { id: input.userId, deactivatedAt: null },
      select: { id: true },
    });
    if (!user) {
      return false;
    }
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: input.userId },
        data: {
          firstName: input.firstName,
          lastName: input.lastName,
          role: input.role,
        },
      });
      await replaceMemberships(transaction, input.userId, input.memberships);
    });
    return true;
  },
};

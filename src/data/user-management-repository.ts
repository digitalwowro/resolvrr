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
      helpdeskConnectionId: true,
      role: true,
    },
    orderBy: { createdAt: "asc" },
  },
  helpdeskConnections: {
    select: { id: true },
  },
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
): ManagedUserMembership {
  return {
    canEditAiRephraseStyleOverrides:
      membership.canEditAiRephraseStyleOverrides,
    canEditMyStyle: membership.canEditMyStyle,
    helpdeskConnectionId: membership.helpdeskConnectionId,
    role: membership.role,
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
    memberships: user.workspaceMemberships.map(toMembership),
    ownedWorkspaceIds: user.helpdeskConnections.map((connection) => connection.id),
    role: user.role,
  };
}

async function replaceMemberships(
  transaction: Prisma.TransactionClient,
  userId: string,
  memberships: ManagedUserMembership[],
) {
  await transaction.workspaceMembership.deleteMany({ where: { userId } });
  if (memberships.length === 0) {
    return;
  }
  await transaction.workspaceMembership.createMany({
    data: memberships.map((membership) => ({
      canEditAiRephraseStyleOverrides:
        membership.canEditAiRephraseStyleOverrides,
      canEditMyStyle: membership.canEditMyStyle,
      helpdeskConnectionId: membership.helpdeskConnectionId,
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
    const workspaces = await prisma.helpdeskConnection.findMany({
      orderBy: [{ displayName: "asc" }, { createdAt: "asc" }],
      select: { displayName: true, id: true, userId: true },
    });
    return workspaces.map((workspace) => ({
      id: workspace.id,
      label: workspace.displayName,
      ownerUserId: workspace.userId,
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
    const owned = await prisma.helpdeskConnection.findMany({
      where: { userId: input.ownerUserId },
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
      owned.map((workspace) =>
        prisma.helpdeskConnection.update({
          where: { id: workspace.id },
          data: { userId: input.replacements[workspace.id] },
        }),
      ),
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

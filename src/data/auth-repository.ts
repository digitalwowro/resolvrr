import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import type { AuthRepository, CreateUserInput } from "@/auth/repository";
import type { AuthUser } from "@/auth/types";

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  firstName: true,
  lastName: true,
  avatarDataUrl: true,
  role: true,
  deactivatedAt: true,
} satisfies Prisma.UserSelect;

function derivedDisplayName(user: {
  displayName: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
}) {
  const fullName = [user.firstName, user.lastName]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" ");

  return fullName || user.displayName || null;
}

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
  avatarDataUrl: string | null;
  role: "USER" | "ADMIN";
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: derivedDisplayName(user),
    firstName: user.firstName,
    lastName: user.lastName,
    avatarDataUrl: user.avatarDataUrl,
    role: user.role,
  };
}

function isUniqueConstraintError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export const prismaAuthRepository: AuthRepository = {
  async findUserWithPasswordByEmail(email) {
    const user = await prisma.user.findFirst({
      where: { email, deactivatedAt: null },
      select: {
        ...userSelect,
        passwordLogin: {
          select: { passwordHash: true },
        },
      },
    });

    if (!user?.passwordLogin) {
      return null;
    }

    return {
      user: toAuthUser(user),
      passwordHash: user.passwordLogin.passwordHash,
    };
  },

  async findUserWithPasswordById(userId) {
    const user = await prisma.user.findFirst({
      where: { id: userId, deactivatedAt: null },
      select: {
        ...userSelect,
        passwordLogin: {
          select: { passwordHash: true },
        },
      },
    });

    if (!user?.passwordLogin) {
      return null;
    }

    return {
      user: toAuthUser(user),
      passwordHash: user.passwordLogin.passwordHash,
    };
  },

  async createUserWithPassword(input: CreateUserInput) {
    try {
      const user = await prisma.user.create({
        data: {
          email: input.email,
          passwordLogin: {
            create: {
              passwordHash: input.passwordHash,
            },
          },
        },
        select: userSelect,
      });

      return toAuthUser(user);
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return null;
      }
      throw error;
    }
  },

  async updateUserProfileName(input) {
    const user = await prisma.user.update({
      where: { id: input.userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
      },
      select: userSelect,
    });

    return toAuthUser(user);
  },

  async updateUserAvatarDataUrl(input) {
    const user = await prisma.user.update({
      where: { id: input.userId },
      data: {
        avatarDataUrl: input.avatarDataUrl,
      },
      select: userSelect,
    });

    return toAuthUser(user);
  },

  async updatePasswordHash(userId, passwordHash) {
    await prisma.passwordLogin.update({
      where: { userId },
      data: { passwordHash },
    });
  },

  async createSession(input) {
    await prisma.session.create({
      data: {
        userId: input.userId,
        sessionTokenHash: input.sessionTokenHash,
        expiresAt: input.expiresAt,
      },
    });
  },

  async findSessionByTokenHash(sessionTokenHash) {
    const session = await prisma.session.findUnique({
      where: { sessionTokenHash },
      select: {
        expiresAt: true,
        user: {
          select: userSelect,
        },
      },
    });

    if (!session || session.user.deactivatedAt) {
      return null;
    }

    return {
      user: toAuthUser(session.user),
      expiresAt: session.expiresAt,
    };
  },

  async deleteSessionByTokenHash(sessionTokenHash) {
    await prisma.session.deleteMany({
      where: { sessionTokenHash },
    });
  },

  async deleteOtherSessions(userId, currentSessionTokenHash) {
    await prisma.session.deleteMany({
      where: {
        userId,
        sessionTokenHash: {
          not: currentSessionTokenHash,
        },
      },
    });
  },

  async deleteExpiredSessions(now) {
    await prisma.session.deleteMany({
      where: {
        expiresAt: {
          lte: now,
        },
      },
    });
  },
};

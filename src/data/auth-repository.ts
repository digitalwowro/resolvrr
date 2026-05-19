import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import type { AuthRepository, CreateUserInput } from "@/auth/repository";
import type { AuthUser } from "@/auth/types";

const userSelect = {
  id: true,
  email: true,
  displayName: true,
  role: true,
} satisfies Prisma.UserSelect;

function toAuthUser(user: {
  id: string;
  email: string;
  displayName: string | null;
  role: "USER" | "ADMIN";
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
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
    const user = await prisma.user.findUnique({
      where: { email },
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

    if (!session) {
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

import type { AuthRepository, CreateUserInput } from "@/auth/repository";
import type { AuthSessionRecord, AuthUser } from "@/auth/types";

export class FakeAuthRepository implements AuthRepository {
  users = new Map<string, { user: AuthUser; passwordHash: string }>();
  sessions = new Map<string, AuthSessionRecord>();
  deletedSessionHashes: string[] = [];
  cleanupDates: Date[] = [];

  async findUserWithPasswordByEmail(email: string) {
    return this.users.get(email) ?? null;
  }

  async findUserWithPasswordById(userId: string) {
    return (
      [...this.users.values()].find((record) => record.user.id === userId) ??
      null
    );
  }

  async createUserWithPassword(input: CreateUserInput) {
    if (this.users.has(input.email)) {
      return null;
    }

    const user: AuthUser = {
      id: `user-${this.users.size + 1}`,
      email: input.email,
      displayName: null,
      firstName: null,
      lastName: null,
      avatarDataUrl: null,
      role: "USER",
    };

    this.users.set(input.email, { user, passwordHash: input.passwordHash });
    return user;
  }

  async updateUserProfileName(input: {
    firstName: string | null;
    lastName: string | null;
    userId: string;
  }) {
    return this.updateUser(input.userId, (user) => {
      const displayName = [input.firstName, input.lastName]
        .filter(Boolean)
        .join(" ");
      return {
        ...user,
        displayName: displayName || null,
        firstName: input.firstName,
        lastName: input.lastName,
      };
    });
  }

  async updateUserAvatarDataUrl(input: {
    avatarDataUrl: string;
    userId: string;
  }) {
    return this.updateUser(input.userId, (user) => ({
      ...user,
      avatarDataUrl: input.avatarDataUrl,
    }));
  }

  async updatePasswordHash(userId: string, passwordHash: string) {
    const record = [...this.users.entries()].find(
      ([, value]) => value.user.id === userId,
    );
    if (!record) {
      throw new Error("Missing fake user");
    }

    const [email, value] = record;
    this.users.set(email, { ...value, passwordHash });
  }

  async createSession(input: {
    userId: string;
    sessionTokenHash: string;
    expiresAt: Date;
  }) {
    const user = [...this.users.values()].find(
      (record) => record.user.id === input.userId,
    )?.user;

    if (!user) {
      throw new Error("Missing fake user");
    }

    this.sessions.set(input.sessionTokenHash, {
      user,
      expiresAt: input.expiresAt,
    });
  }

  async findSessionByTokenHash(sessionTokenHash: string) {
    return this.sessions.get(sessionTokenHash) ?? null;
  }

  async deleteSessionByTokenHash(sessionTokenHash: string) {
    this.deletedSessionHashes.push(sessionTokenHash);
    this.sessions.delete(sessionTokenHash);
  }

  async deleteOtherSessions(userId: string, currentSessionTokenHash: string) {
    this.sessions.forEach((session, key) => {
      if (session.user.id === userId && key !== currentSessionTokenHash) {
        this.sessions.delete(key);
      }
    });
  }

  async deleteExpiredSessions(now: Date) {
    this.cleanupDates.push(now);
  }

  private updateUser(
    userId: string,
    update: (user: AuthUser) => AuthUser,
  ): AuthUser | null {
    const record = [...this.users.entries()].find(
      ([, value]) => value.user.id === userId,
    );
    if (!record) {
      return null;
    }

    const [email, value] = record;
    const user = update(value.user);
    this.users.set(email, { ...value, user });
    this.sessions.forEach((session, key) => {
      if (session.user.id === userId) {
        this.sessions.set(key, { ...session, user });
      }
    });
    return user;
  }
}

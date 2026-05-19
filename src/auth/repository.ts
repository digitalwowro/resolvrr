import type { AuthSessionRecord, AuthUser } from "./types";

export type AuthUserWithPassword = {
  user: AuthUser;
  passwordHash: string;
};

export type CreateUserInput = {
  email: string;
  passwordHash: string;
};

export type AuthRepository = {
  findUserWithPasswordByEmail(email: string): Promise<AuthUserWithPassword | null>;
  createUserWithPassword(input: CreateUserInput): Promise<AuthUser | null>;
  createSession(input: {
    userId: string;
    sessionTokenHash: string;
    expiresAt: Date;
  }): Promise<void>;
  findSessionByTokenHash(
    sessionTokenHash: string,
  ): Promise<AuthSessionRecord | null>;
  deleteSessionByTokenHash(sessionTokenHash: string): Promise<void>;
  deleteExpiredSessions(now: Date): Promise<void>;
};

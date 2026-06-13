import { describe, expect, it } from "vitest";
import type { AuthRepository, CreateUserInput } from "@/auth/repository";
import {
  changeUserPassword,
  cleanupExpiredSessions,
  getUserForSessionToken,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
  updateUserAvatar,
  updateUserProfile,
} from "@/auth/service";
import { hashSessionToken } from "@/auth/session";
import { verifyPassword } from "@/auth/password";
import type { AuthSessionRecord, AuthUser } from "@/auth/types";

class FakeAuthRepository implements AuthRepository {
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
    const record = [...this.users.entries()].find(
      ([, value]) => value.user.id === input.userId,
    );
    if (!record) {
      return null;
    }

    const [email, value] = record;
    const displayName = [input.firstName, input.lastName]
      .filter(Boolean)
      .join(" ");
    const user = {
      ...value.user,
      displayName: displayName || null,
      firstName: input.firstName,
      lastName: input.lastName,
    };
    this.users.set(email, { ...value, user });
    this.sessions.forEach((session, key) => {
      if (session.user.id === input.userId) {
        this.sessions.set(key, { ...session, user });
      }
    });
    return user;
  }

  async updateUserAvatarDataUrl(input: {
    avatarDataUrl: string;
    userId: string;
  }) {
    const record = [...this.users.entries()].find(
      ([, value]) => value.user.id === input.userId,
    );
    if (!record) {
      return null;
    }

    const [email, value] = record;
    const user = {
      ...value.user,
      avatarDataUrl: input.avatarDataUrl,
    };
    this.users.set(email, { ...value, user });
    this.sessions.forEach((session, key) => {
      if (session.user.id === input.userId) {
        this.sessions.set(key, { ...session, user });
      }
    });
    return user;
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
}

describe("auth service", () => {
  it("registers a user, hashes the password, and starts a session", async () => {
    const repository = new FakeAuthRepository();
    const result = await registerWithPassword(repository, {
      email: "USER@example.com",
      password: "long-enough-password",
    });

    expect(result.ok).toBe(true);
    if (!result.ok) {
      return;
    }

    const created = repository.users.get("user@example.com");
    expect(created).toBeDefined();
    expect(created?.passwordHash).not.toBe("long-enough-password");
    expect(await verifyPassword(created?.passwordHash ?? "", "long-enough-password")).toBe(
      true,
    );
    expect(repository.sessions.has(hashSessionToken(result.sessionToken))).toBe(
      true,
    );
  });

  it("rejects duplicate registration", async () => {
    const repository = new FakeAuthRepository();
    await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });

    const duplicate = await registerWithPassword(repository, {
      email: "USER@example.com",
      password: "long-enough-password",
    });

    expect(duplicate).toEqual({ ok: false, code: "email_taken" });
  });

  it("logs in with a valid password and uses a generic failure otherwise", async () => {
    const repository = new FakeAuthRepository();
    await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });

    const valid = await loginWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });
    const wrongPassword = await loginWithPassword(repository, {
      email: "user@example.com",
      password: "not-the-right-password",
    });
    const missingUser = await loginWithPassword(repository, {
      email: "missing@example.com",
      password: "long-enough-password",
    });

    expect(valid.ok).toBe(true);
    expect(wrongPassword).toEqual({ ok: false, code: "invalid_credentials" });
    expect(missingUser).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("rejects expired sessions", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });

    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const sessionHash = hashSessionToken(registered.sessionToken);
    repository.sessions.set(sessionHash, {
      user: registered.user,
      expiresAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await expect(
      getUserForSessionToken(
        repository,
        registered.sessionToken,
        new Date("2026-01-02T00:00:00.000Z"),
      ),
    ).resolves.toBeNull();
  });

  it("deletes the hashed session token on logout", async () => {
    const repository = new FakeAuthRepository();
    await logoutSession(repository, "raw-session-token");

    expect(repository.deletedSessionHashes).toEqual([
      hashSessionToken("raw-session-token"),
    ]);
  });

  it("delegates expired session cleanup to the repository", async () => {
    const repository = new FakeAuthRepository();
    const now = new Date("2026-05-19T07:00:00.000Z");

    await cleanupExpiredSessions(repository, now);

    expect(repository.cleanupDates).toEqual([now]);
  });

  it("updates a user's first and last name", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const result = await updateUserProfile(repository, registered.user.id, {
      firstName: "  Demo  ",
      lastName: "  User  ",
    });

    expect(result).toMatchObject({
      ok: true,
      code: "profile-updated",
      user: {
        displayName: "Demo User",
        firstName: "Demo",
        lastName: "User",
      },
    });
  });

  it("updates a user's avatar from a validated image upload", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const formData = new FormData();
    formData.set(
      "avatar",
      new File(["avatar"], "avatar.png", { type: "image/png" }),
    );

    const result = await updateUserAvatar(
      repository,
      registered.user.id,
      formData,
    );

    expect(result).toMatchObject({
      ok: true,
      code: "avatar-updated",
      user: {
        avatarDataUrl: "data:image/png;base64,YXZhdGFy",
      },
    });
  });

  it("rejects unsupported avatar uploads", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const formData = new FormData();
    formData.set("avatar", new File(["not-image"], "avatar.txt", { type: "text/plain" }));

    await expect(
      updateUserAvatar(repository, registered.user.id, formData),
    ).resolves.toEqual({ ok: false, code: "invalid-avatar" });
  });

  it("changes a password and revokes other sessions", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const currentSessionHash = hashSessionToken(registered.sessionToken);
    repository.sessions.set("other-session", {
      user: registered.user,
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    });

    const result = await changeUserPassword(repository, {
      currentSessionTokenHash: currentSessionHash,
      rawInput: {
        currentPassword: "long-enough-password",
        newPassword: "new-long-enough-password",
        confirmPassword: "new-long-enough-password",
      },
      userId: registered.user.id,
    });

    expect(result).toEqual({ ok: true, code: "password-changed" });
    expect(repository.sessions.has(currentSessionHash)).toBe(true);
    expect(repository.sessions.has("other-session")).toBe(false);
    const updated = repository.users.get("user@example.com");
    expect(
      await verifyPassword(
        updated?.passwordHash ?? "",
        "new-long-enough-password",
      ),
    ).toBe(true);
  });

  it("rejects password changes with the wrong current password", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const result = await changeUserPassword(repository, {
      currentSessionTokenHash: hashSessionToken(registered.sessionToken),
      rawInput: {
        currentPassword: "wrong-current-password",
        newPassword: "new-long-enough-password",
        confirmPassword: "new-long-enough-password",
      },
      userId: registered.user.id,
    });

    expect(result).toEqual({ ok: false, code: "invalid-current-password" });
  });

  it("rejects password changes with invalid or mismatched new passwords", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registerWithPassword(repository, {
      email: "user@example.com",
      password: "long-enough-password",
    });
    expect(registered.ok).toBe(true);
    if (!registered.ok) {
      return;
    }

    const shortPassword = await changeUserPassword(repository, {
      currentSessionTokenHash: hashSessionToken(registered.sessionToken),
      rawInput: {
        currentPassword: "long-enough-password",
        newPassword: "short",
        confirmPassword: "short",
      },
      userId: registered.user.id,
    });
    const mismatchedPassword = await changeUserPassword(repository, {
      currentSessionTokenHash: hashSessionToken(registered.sessionToken),
      rawInput: {
        currentPassword: "long-enough-password",
        newPassword: "new-long-enough-password",
        confirmPassword: "another-long-enough-password",
      },
      userId: registered.user.id,
    });

    expect(shortPassword).toEqual({
      ok: false,
      code: "invalid-password-input",
    });
    expect(mismatchedPassword).toEqual({
      ok: false,
      code: "invalid-password-input",
    });
  });
});

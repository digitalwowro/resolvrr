import { describe, expect, it } from "vitest";
import {
  cleanupExpiredSessions,
  getUserForSessionToken,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
} from "@/auth/service";
import { hashSessionToken } from "@/auth/session";
import { verifyPassword } from "@/auth/password";
import { FakeAuthRepository } from "./auth-service-test-helpers";

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

});

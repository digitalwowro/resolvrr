import { describe, expect, it } from "vitest";
import {
  changeUserPassword,
  registerWithPassword,
  updateUserAvatar,
  updateUserProfile,
} from "@/auth/service";
import { verifyPassword } from "@/auth/password";
import { hashSessionToken } from "@/auth/session";
import { FakeAuthRepository } from "./auth-service-test-helpers";

async function registeredUser(repository: FakeAuthRepository) {
  const registered = await registerWithPassword(repository, {
    email: "user@example.com",
    password: "long-enough-password",
  });
  expect(registered.ok).toBe(true);
  if (!registered.ok) {
    throw new Error("Expected registration to succeed.");
  }
  return registered;
}

describe("auth service profile", () => {
  it("updates a user's first and last name", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registeredUser(repository);

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
    const registered = await registeredUser(repository);
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
    const registered = await registeredUser(repository);
    const formData = new FormData();
    formData.set(
      "avatar",
      new File(["not-image"], "avatar.txt", { type: "text/plain" }),
    );

    await expect(
      updateUserAvatar(repository, registered.user.id, formData),
    ).resolves.toEqual({ ok: false, code: "invalid-avatar" });
  });

  it("changes a password and revokes other sessions", async () => {
    const repository = new FakeAuthRepository();
    const registered = await registeredUser(repository);
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
    const registered = await registeredUser(repository);

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
    const registered = await registeredUser(repository);

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

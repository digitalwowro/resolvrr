import { hashPassword, verifyPassword } from "./password";
import type { AuthRepository } from "./repository";
import {
  createSessionToken,
  hashSessionToken,
  sessionExpiresAt,
} from "./session";
import type { AuthResult, AuthUser } from "./types";
import {
  parseChangePasswordInput,
  parseAvatarInput,
  parseLoginInput,
  parseProfileInput,
  parseRegistrationInput,
  type LoginInput,
} from "./validation";

export type UpdateProfileResult =
  | { ok: true; code: "profile-updated"; user: AuthUser }
  | { ok: false; code: "invalid-profile" | "not-authenticated" };

export type UpdateAvatarResult =
  | { ok: true; code: "avatar-updated"; user: AuthUser }
  | { ok: false; code: "invalid-avatar" | "not-authenticated" };

export type ChangePasswordResult =
  | { ok: true; code: "password-changed" }
  | {
      ok: false;
      code:
        | "invalid-password-input"
        | "invalid-current-password"
        | "not-authenticated";
    };

async function createSessionForUser(
  repository: AuthRepository,
  user: AuthUser,
): Promise<AuthResult> {
  const sessionToken = createSessionToken();
  const expiresAt = sessionExpiresAt();

  await repository.createSession({
    userId: user.id,
    sessionTokenHash: hashSessionToken(sessionToken),
    expiresAt,
  });

  return { ok: true, user, sessionToken, expiresAt };
}

export async function registerWithPassword(
  repository: AuthRepository,
  rawInput: FormData | unknown,
): Promise<AuthResult> {
  const input = parseRegistrationInput(rawInput);
  if (!input) {
    return { ok: false, code: "invalid_registration" };
  }

  const existing = await repository.findUserWithPasswordByEmail(input.email);
  if (existing) {
    return { ok: false, code: "email_taken" };
  }

  const passwordHash = await hashPassword(input.password);
  const user = await repository.createUserWithPassword({
    email: input.email,
    passwordHash,
  });

  if (!user) {
    return { ok: false, code: "email_taken" };
  }

  return createSessionForUser(repository, user);
}

export async function loginWithPassword(
  repository: AuthRepository,
  rawInput: FormData | unknown,
): Promise<AuthResult> {
  const input = parseLoginInput(rawInput);
  if (!input) {
    return { ok: false, code: "invalid_credentials" };
  }

  const userWithPassword = await repository.findUserWithPasswordByEmail(
    input.email,
  );
  if (!userWithPassword) {
    return { ok: false, code: "invalid_credentials" };
  }

  const verified = await verifyPassword(
    userWithPassword.passwordHash,
    input.password,
  );

  if (!verified) {
    return { ok: false, code: "invalid_credentials" };
  }

  return createSessionForUser(repository, userWithPassword.user);
}

export async function updateUserProfile(
  repository: AuthRepository,
  userId: string | undefined,
  rawInput: FormData | unknown,
): Promise<UpdateProfileResult> {
  if (!userId) {
    return { ok: false, code: "not-authenticated" };
  }

  const input = parseProfileInput(rawInput);
  if (!input) {
    return { ok: false, code: "invalid-profile" };
  }

  const user = await repository.updateUserProfileName({
    firstName: input.firstName,
    lastName: input.lastName,
    userId,
  });

  return user
    ? { ok: true, code: "profile-updated", user }
    : { ok: false, code: "not-authenticated" };
}

export async function updateUserAvatar(
  repository: AuthRepository,
  userId: string | undefined,
  rawInput: FormData | unknown,
): Promise<UpdateAvatarResult> {
  if (!userId) {
    return { ok: false, code: "not-authenticated" };
  }

  const input = await parseAvatarInput(rawInput);
  if (!input) {
    return { ok: false, code: "invalid-avatar" };
  }

  const user = await repository.updateUserAvatarDataUrl({
    avatarDataUrl: input.avatarDataUrl,
    userId,
  });

  return user
    ? { ok: true, code: "avatar-updated", user }
    : { ok: false, code: "not-authenticated" };
}

export async function changeUserPassword(
  repository: AuthRepository,
  input: {
    currentSessionTokenHash: string | undefined;
    rawInput: FormData | unknown;
    userId: string | undefined;
  },
): Promise<ChangePasswordResult> {
  if (!input.userId || !input.currentSessionTokenHash) {
    return { ok: false, code: "not-authenticated" };
  }

  const parsed = parseChangePasswordInput(input.rawInput);
  if (!parsed) {
    return { ok: false, code: "invalid-password-input" };
  }

  const userWithPassword = await repository.findUserWithPasswordById(
    input.userId,
  );
  if (!userWithPassword) {
    return { ok: false, code: "not-authenticated" };
  }

  const verified = await verifyPassword(
    userWithPassword.passwordHash,
    parsed.currentPassword,
  );
  if (!verified) {
    return { ok: false, code: "invalid-current-password" };
  }

  const passwordHash = await hashPassword(parsed.newPassword);
  await repository.updatePasswordHash(input.userId, passwordHash);
  await repository.deleteOtherSessions(
    input.userId,
    input.currentSessionTokenHash,
  );

  return { ok: true, code: "password-changed" };
}

export async function getUserForSessionToken(
  repository: AuthRepository,
  sessionToken: string | undefined,
  now = new Date(),
): Promise<AuthUser | null> {
  if (!sessionToken) {
    return null;
  }

  const session = await repository.findSessionByTokenHash(
    hashSessionToken(sessionToken),
  );

  if (!session || session.expiresAt <= now) {
    return null;
  }

  return session.user;
}

export async function logoutSession(
  repository: AuthRepository,
  sessionToken: string | undefined,
): Promise<void> {
  if (!sessionToken) {
    return;
  }

  await repository.deleteSessionByTokenHash(hashSessionToken(sessionToken));
}

export async function cleanupExpiredSessions(
  repository: AuthRepository,
  now = new Date(),
): Promise<void> {
  await repository.deleteExpiredSessions(now);
}

export type { LoginInput };

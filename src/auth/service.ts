import { hashPassword, verifyPassword } from "./password";
import type { AuthRepository } from "./repository";
import {
  createSessionToken,
  hashSessionToken,
  sessionExpiresAt,
} from "./session";
import type { AuthResult, AuthUser } from "./types";
import {
  parseLoginInput,
  parseRegistrationInput,
  type LoginInput,
} from "./validation";

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

export type { LoginInput };

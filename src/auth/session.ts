import { createHash, randomBytes } from "node:crypto";

export const sessionCookieName = "resolvrr_session";

export function createSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

export function sessionExpiresAt(days = 30): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

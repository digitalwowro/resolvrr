"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prismaAuthRepository } from "@/data/auth-repository";
import {
  changeUserPassword,
  getUserForSessionToken,
  loginWithPassword,
  logoutSession,
  registerWithPassword,
  updateUserAvatar,
  updateUserProfile,
} from "@/auth/service";
import {
  clearedSessionCookieOptions,
  sessionCookieName,
  sessionCookieOptions,
} from "@/auth/session-cookie";
import { hashSessionToken } from "@/auth/session";

function authErrorPath(path: "/login" | "/register", code: string): string {
  return `${path}?error=${encodeURIComponent(code)}`;
}

async function setSessionCookie(sessionToken: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(
    sessionCookieName,
    sessionToken,
    sessionCookieOptions(expiresAt),
  );
}

async function currentUserSession() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;
  const user = await getUserForSessionToken(prismaAuthRepository, sessionToken);

  return {
    user,
    sessionTokenHash: sessionToken ? hashSessionToken(sessionToken) : undefined,
  };
}

export async function loginAction(formData: FormData) {
  const result = await loginWithPassword(prismaAuthRepository, formData);

  if (!result.ok) {
    redirect(authErrorPath("/login", result.code));
  }

  await setSessionCookie(result.sessionToken, result.expiresAt);
  redirect("/workspace");
}

export async function registerAction(formData: FormData) {
  const result = await registerWithPassword(prismaAuthRepository, formData);

  if (!result.ok) {
    redirect(authErrorPath("/register", result.code));
  }

  await setSessionCookie(result.sessionToken, result.expiresAt);
  redirect("/workspace");
}

export async function logoutAction() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;

  await logoutSession(prismaAuthRepository, sessionToken);
  cookieStore.set(sessionCookieName, "", clearedSessionCookieOptions());
  redirect("/login");
}

export async function updateProfileAction(formData: FormData) {
  const session = await currentUserSession();

  return updateUserProfile(prismaAuthRepository, session.user?.id, formData);
}

export async function updateAvatarAction(formData: FormData) {
  const session = await currentUserSession();

  return updateUserAvatar(prismaAuthRepository, session.user?.id, formData);
}

export async function changePasswordAction(formData: FormData) {
  const session = await currentUserSession();

  return changeUserPassword(prismaAuthRepository, {
    currentSessionTokenHash: session.sessionTokenHash,
    rawInput: formData,
    userId: session.user?.id,
  });
}

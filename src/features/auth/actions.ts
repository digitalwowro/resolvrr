"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prismaAuthRepository } from "@/data/auth-repository";
import {
  loginWithPassword,
  logoutSession,
  registerWithPassword,
} from "@/auth/service";
import {
  clearedSessionCookieOptions,
  sessionCookieName,
  sessionCookieOptions,
} from "@/auth/session-cookie";

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

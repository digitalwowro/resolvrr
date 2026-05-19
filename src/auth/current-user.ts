import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prismaAuthRepository } from "@/data/auth-repository";
import { getUserForSessionToken } from "./service";
import { sessionCookieName } from "./session-cookie";
import type { AuthUser } from "./types";

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(sessionCookieName)?.value;

  return getUserForSessionToken(prismaAuthRepository, sessionToken);
}

export async function requireCurrentUser(): Promise<AuthUser> {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return user;
}

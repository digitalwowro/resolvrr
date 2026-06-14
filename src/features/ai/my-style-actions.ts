"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaMyStyleRepository } from "@/data/my-style-repository";
import { loadMyStyle, resetMyStyle, saveMyStyle } from "./my-style-service";

export async function loadMyStyleAction() {
  const user = await requireCurrentUser();
  return loadMyStyle({
    encryptionKey: env.APP_ENCRYPTION_KEY,
    repository: prismaMyStyleRepository,
    userId: user.id,
  });
}

export async function saveMyStyleAction(formData: FormData) {
  const user = await requireCurrentUser();
  return saveMyStyle({
    encryptionKey: env.APP_ENCRYPTION_KEY,
    formData,
    repository: prismaMyStyleRepository,
    userId: user.id,
  });
}

export async function resetMyStyleAction() {
  const user = await requireCurrentUser();
  return resetMyStyle({
    encryptionKey: env.APP_ENCRYPTION_KEY,
    repository: prismaMyStyleRepository,
    userId: user.id,
  });
}

"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { prismaUserManagementRepository } from "@/data/user-management-repository";
import {
  deleteManagedUser,
  loadUserManagementData,
  resetManagedUserPassword,
  saveManagedUser,
} from "./service";

export async function loadUserManagementAction() {
  const user = await requireCurrentUser();
  return loadUserManagementData(prismaUserManagementRepository, user);
}

export async function saveManagedUserAction(input: unknown) {
  const user = await requireCurrentUser();
  return saveManagedUser(prismaUserManagementRepository, user, input);
}

export async function resetManagedUserPasswordAction(input: unknown) {
  const user = await requireCurrentUser();
  return resetManagedUserPassword(prismaUserManagementRepository, user, input);
}

export async function deleteManagedUserAction(input: unknown) {
  const user = await requireCurrentUser();
  return deleteManagedUser(prismaUserManagementRepository, user, input);
}

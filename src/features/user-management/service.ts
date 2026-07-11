import { hashPassword } from "@/auth/password";
import type { AuthUser } from "@/auth/types";
import type {
  UserManagementActionResult,
  UserManagementData,
} from "./model";
import type { UserManagementRepository } from "./repository";
import {
  parseDeleteManagedUserRequest,
  parseResetManagedUserPasswordRequest,
  parseSaveManagedUserRequest,
} from "./validation";

function isAdmin(user: AuthUser) {
  return user.role === "ADMIN";
}

function userStatus(user: { deactivatedAt: string | null }) {
  return user.deactivatedAt ? "deactivated" as const : "active" as const;
}

function deletedEmail(userId: string) {
  return `deleted-${userId}@deleted.resolvrr.local`;
}

export async function loadUserManagementData(
  repository: UserManagementRepository,
  currentUser: AuthUser,
): Promise<UserManagementData> {
  if (!isAdmin(currentUser)) {
    return { currentUserId: currentUser.id, users: [], workspaces: [] };
  }

  const [users, workspaces] = await Promise.all([
    repository.listUsers(),
    repository.listWorkspaces(),
  ]);

  return {
    currentUserId: currentUser.id,
    users: users.map((user) => ({
      ...user,
      status: userStatus(user),
      workspaceAccessCount: user.memberships.length,
    })),
    workspaces,
  };
}

async function resultWithData(
  repository: UserManagementRepository,
  currentUser: AuthUser,
  code: UserManagementActionResult["code"],
): Promise<UserManagementActionResult> {
  return {
    code,
    data: await loadUserManagementData(repository, currentUser),
    ok: true,
  };
}

export async function saveManagedUser(
  repository: UserManagementRepository,
  currentUser: AuthUser,
  input: unknown,
): Promise<UserManagementActionResult> {
  if (!isAdmin(currentUser)) {
    return { ok: false, code: "not-admin" };
  }

  const parsed = parseSaveManagedUserRequest(input);
  if (!parsed) {
    return { ok: false, code: "invalid-input" };
  }

  if (parsed.userId) {
    const updated = await repository.updateUser({
      firstName: parsed.firstName,
      lastName: parsed.lastName,
      memberships: parsed.memberships,
      role: parsed.role,
      userId: parsed.userId,
    });
    return updated
      ? resultWithData(repository, currentUser, "updated")
      : { ok: false, code: "not-found" };
  }

  const created = await repository.createUser({
    email: parsed.email,
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    memberships: parsed.memberships,
    passwordHash: await hashPassword(parsed.password ?? ""),
    role: parsed.role,
  });

  return created === "email-taken"
    ? { ok: false, code: "email-taken" }
    : resultWithData(repository, currentUser, "created");
}

export async function resetManagedUserPassword(
  repository: UserManagementRepository,
  currentUser: AuthUser,
  input: unknown,
): Promise<UserManagementActionResult> {
  if (!isAdmin(currentUser)) {
    return { ok: false, code: "not-admin" };
  }

  const parsed = parseResetManagedUserPasswordRequest(input);
  if (!parsed) {
    return { ok: false, code: "invalid-input" };
  }

  const updated = await repository.resetPassword(
    parsed.userId,
    await hashPassword(parsed.password),
  );
  return updated
    ? resultWithData(repository, currentUser, "password-reset")
    : { ok: false, code: "not-found" };
}

export async function deleteManagedUser(
  repository: UserManagementRepository,
  currentUser: AuthUser,
  input: unknown,
  now = new Date(),
): Promise<UserManagementActionResult> {
  if (!isAdmin(currentUser)) {
    return { ok: false, code: "not-admin" };
  }

  const parsed = parseDeleteManagedUserRequest(input);
  if (!parsed) {
    return { ok: false, code: "invalid-input" };
  }
  if (parsed.userId === currentUser.id) {
    return { ok: false, code: "self-delete-blocked" };
  }

  const target = await repository.getUserById(parsed.userId);
  if (!target) {
    return { ok: false, code: "not-found" };
  }

  const transferResult = await repository.transferOwnedWorkspaces({
    ownerUserId: parsed.userId,
    replacements: parsed.replacementOwners ?? {},
  });
  if (transferResult !== "transferred") {
    return { ok: false, code: transferResult };
  }

  if (target.hasProviderMutations) {
    await repository.deleteUserPersonalData(parsed.userId);
    await repository.scrubDeactivateUser({
      email: deletedEmail(parsed.userId),
      userId: parsed.userId,
      when: now,
    });
    return resultWithData(repository, currentUser, "deactivated");
  }

  await repository.deleteUser(parsed.userId);
  return resultWithData(repository, currentUser, "deleted");
}

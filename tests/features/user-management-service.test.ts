import { describe, expect, it } from "vitest";
import type { AuthUser } from "@/auth/types";
import {
  deleteManagedUser,
  loadUserManagementData,
  resetManagedUserPassword,
  saveManagedUser,
} from "@/features/user-management/service";
import type { ManagedUserRecord } from "@/features/user-management/repository";
import type { UserManagementRepository } from "@/features/user-management/repository";

function authUser(role: AuthUser["role"] = "ADMIN", id = "admin-1"): AuthUser {
  return {
    avatarDataUrl: null,
    displayName: null,
    email: `${id}@example.com`,
    firstName: null,
    id,
    lastName: null,
    role,
  };
}

function managedUser(
  overrides: Partial<ManagedUserRecord> = {},
): ManagedUserRecord {
  return {
    createdAt: "2026-06-18T00:00:00.000Z",
    deactivatedAt: null,
    email: "user@example.com",
    firstName: "Demo",
    hasProviderMutations: false,
    id: "user-1",
    lastName: "User",
    memberships: [],
    ownedWorkspaceIds: [],
    role: "USER",
    ...overrides,
  };
}

class FakeUserManagementRepository implements UserManagementRepository {
  deletedUserIds: string[] = [];
  passwordResets: string[] = [];
  personalDataDeleted: string[] = [];
  scrubbedUserIds: string[] = [];
  users = new Map<string, ManagedUserRecord>();
  workspaces = [{ id: "workspace-1", label: "Support", ownerUserId: "admin-1" }];

  constructor(users: ManagedUserRecord[] = [managedUser()]) {
    users.forEach((user) => this.users.set(user.id, user));
  }

  async createUser(input: Parameters<UserManagementRepository["createUser"]>[0]) {
    if ([...this.users.values()].some((user) => user.email === input.email)) {
      return "email-taken" as const;
    }
    const id = `user-${this.users.size + 1}`;
    this.users.set(
      id,
      managedUser({
        email: input.email,
        firstName: input.firstName,
        id,
        lastName: input.lastName,
        memberships: input.memberships,
        role: input.role,
      }),
    );
    return { id };
  }

  async deleteUser(userId: string) {
    this.deletedUserIds.push(userId);
    this.users.delete(userId);
  }

  async deleteUserPersonalData(userId: string) {
    this.personalDataDeleted.push(userId);
  }

  async getUserById(userId: string) {
    return this.users.get(userId) ?? null;
  }

  async listUsers() {
    return [...this.users.values()];
  }

  async listWorkspaces() {
    return this.workspaces;
  }

  async resetPassword(userId: string) {
    if (!this.users.has(userId)) {
      return false;
    }
    this.passwordResets.push(userId);
    return true;
  }

  async scrubDeactivateUser(input: Parameters<UserManagementRepository["scrubDeactivateUser"]>[0]) {
    const user = this.users.get(input.userId);
    if (!user) {
      return;
    }
    this.scrubbedUserIds.push(input.userId);
    this.users.set(input.userId, {
      ...user,
      deactivatedAt: input.when.toISOString(),
      email: input.email,
      firstName: null,
      lastName: null,
      role: "USER",
    });
  }

  async transferOwnedWorkspaces(input: Parameters<UserManagementRepository["transferOwnedWorkspaces"]>[0]) {
    const owned = this.workspaces.filter(
      (workspace) => workspace.ownerUserId === input.ownerUserId,
    );
    if (owned.length === 0) {
      return "transferred" as const;
    }
    if (owned.some((workspace) => !input.replacements[workspace.id])) {
      return "replacement-owner-required" as const;
    }
    owned.forEach((workspace) => {
      workspace.ownerUserId = input.replacements[workspace.id];
    });
    return "transferred" as const;
  }

  async updateUser(input: Parameters<UserManagementRepository["updateUser"]>[0]) {
    const user = this.users.get(input.userId);
    if (!user || user.deactivatedAt) {
      return false;
    }
    this.users.set(input.userId, {
      ...user,
      firstName: input.firstName,
      lastName: input.lastName,
      memberships: input.memberships,
      role: input.role,
    });
    return true;
  }
}

describe("user management service", () => {
  it("lists users only for admins", async () => {
    const repository = new FakeUserManagementRepository();

    await expect(loadUserManagementData(repository, authUser("USER"))).resolves.toEqual({
      currentUserId: "admin-1",
      users: [],
      workspaces: [],
    });
    await expect(loadUserManagementData(repository, authUser("ADMIN"))).resolves.toMatchObject({
      users: [{ status: "active", workspaceAccessCount: 0 }],
    });
  });

  it("creates users and rejects duplicate emails", async () => {
    const repository = new FakeUserManagementRepository([]);
    const input = {
      email: "new@example.com",
      firstName: "New",
      lastName: "User",
      memberships: [],
      password: "long-enough-password",
      role: "USER" as const,
    };

    await expect(saveManagedUser(repository, authUser(), input)).resolves.toMatchObject({
      ok: true,
      code: "created",
    });
    await expect(saveManagedUser(repository, authUser(), input)).resolves.toEqual({
      ok: false,
      code: "email-taken",
    });
  });

  it("hard-deletes users without provider writes", async () => {
    const repository = new FakeUserManagementRepository([
      managedUser({ hasProviderMutations: false }),
    ]);

    await expect(
      deleteManagedUser(repository, authUser(), { userId: "user-1" }),
    ).resolves.toMatchObject({ ok: true, code: "deleted" });
    expect(repository.deletedUserIds).toEqual(["user-1"]);
    expect(repository.scrubbedUserIds).toEqual([]);
  });

  it("deactivates and scrubs users with provider writes", async () => {
    const repository = new FakeUserManagementRepository([
      managedUser({ hasProviderMutations: true }),
    ]);

    await expect(
      deleteManagedUser(repository, authUser(), { userId: "user-1" }),
    ).resolves.toMatchObject({ ok: true, code: "deactivated" });
    expect(repository.deletedUserIds).toEqual([]);
    expect(repository.personalDataDeleted).toEqual(["user-1"]);
    expect(repository.scrubbedUserIds).toEqual(["user-1"]);
    expect(repository.users.get("user-1")).toMatchObject({
      email: "deleted-user-1@deleted.resolvrr.local",
      firstName: null,
      lastName: null,
    });
  });

  it("requires replacement owners before removing workspace owners", async () => {
    const repository = new FakeUserManagementRepository([
      managedUser({ id: "owner-1", ownedWorkspaceIds: ["workspace-1"] }),
      managedUser({ email: "next@example.com", id: "next-owner" }),
    ]);
    repository.workspaces = [
      { id: "workspace-1", label: "Support", ownerUserId: "owner-1" },
    ];

    await expect(
      deleteManagedUser(repository, authUser(), { userId: "owner-1" }),
    ).resolves.toEqual({ ok: false, code: "replacement-owner-required" });
    await expect(
      deleteManagedUser(repository, authUser(), {
        replacementOwners: { "workspace-1": "next-owner" },
        userId: "owner-1",
      }),
    ).resolves.toMatchObject({ ok: true, code: "deleted" });
    expect(repository.workspaces[0].ownerUserId).toBe("next-owner");
  });

  it("blocks self-delete and supports password reset", async () => {
    const repository = new FakeUserManagementRepository([
      managedUser({ id: "admin-1" }),
    ]);
    const admin = authUser("ADMIN", "admin-1");

    await expect(
      deleteManagedUser(repository, admin, { userId: "admin-1" }),
    ).resolves.toEqual({ ok: false, code: "self-delete-blocked" });
    await expect(
      resetManagedUserPassword(repository, admin, {
        password: "new-long-enough-password",
        userId: "admin-1",
      }),
    ).resolves.toMatchObject({ ok: true, code: "password-reset" });
    expect(repository.passwordResets).toEqual(["admin-1"]);
  });
});

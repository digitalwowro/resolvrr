import type {
  ManagedUser,
  ManagedUserMembership,
  ManagedUserRole,
  ManagedWorkspaceOption,
} from "./model";

export type ManagedUserRecord = Omit<ManagedUser, "status" | "workspaceAccessCount">;

export type UserManagementRepository = {
  createUser(input: {
    email: string;
    firstName: string | null;
    lastName: string | null;
    passwordHash: string;
    role: ManagedUserRole;
    memberships: ManagedUserMembership[];
  }): Promise<"email-taken" | { id: string }>;
  deleteUser(userId: string): Promise<void>;
  deleteUserPersonalData(userId: string): Promise<void>;
  getUserById(userId: string): Promise<ManagedUserRecord | null>;
  listUsers(): Promise<ManagedUserRecord[]>;
  listWorkspaces(): Promise<ManagedWorkspaceOption[]>;
  resetPassword(userId: string, passwordHash: string): Promise<boolean>;
  scrubDeactivateUser(input: {
    email: string;
    userId: string;
    when: Date;
  }): Promise<void>;
  transferOwnedWorkspaces(input: {
    ownerUserId: string;
    replacements: Record<string, string>;
  }): Promise<"replacement-owner-required" | "not-found" | "transferred">;
  updateUser(input: {
    firstName: string | null;
    lastName: string | null;
    memberships: ManagedUserMembership[];
    role: ManagedUserRole;
    userId: string;
  }): Promise<boolean>;
};

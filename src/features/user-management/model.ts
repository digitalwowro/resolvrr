export type ManagedUserRole = "ADMIN" | "USER";
export type ManagedWorkspaceRole = "ADMIN" | "AGENT";
export type ManagedUserStatus = "active" | "deactivated";

export type ManagedUserMembership = {
  canEditAiRephraseStyleOverrides: boolean;
  canEditMyStyle: boolean;
  workspaceId: string;
  role: ManagedWorkspaceRole;
  connectionStatus?: "active" | "auth_failed" | "disconnected" | "not-connected";
};

export type ManagedWorkspaceOption = {
  id: string;
  label: string;
  ownerUserId: string;
};

export type ManagedUser = {
  createdAt: string;
  deactivatedAt: string | null;
  email: string;
  firstName: string | null;
  hasProviderMutations: boolean;
  id: string;
  lastName: string | null;
  memberships: ManagedUserMembership[];
  ownedWorkspaceIds: string[];
  role: ManagedUserRole;
  status: ManagedUserStatus;
  workspaceAccessCount: number;
};

export type UserManagementData = {
  currentUserId: string;
  users: ManagedUser[];
  workspaces: ManagedWorkspaceOption[];
};

export type SaveManagedUserRequest = {
  email: string;
  firstName: string | null;
  lastName: string | null;
  memberships: ManagedUserMembership[];
  password?: string;
  role: ManagedUserRole;
  userId?: string;
};

export type ResetManagedUserPasswordRequest = {
  password: string;
  userId: string;
};

export type DeleteManagedUserRequest = {
  replacementOwners?: Record<string, string>;
  userId: string;
};

export type UserManagementResultCode =
  | "created"
  | "updated"
  | "password-reset"
  | "deleted"
  | "deactivated"
  | "invalid-input"
  | "email-taken"
  | "not-admin"
  | "not-found"
  | "self-delete-blocked"
  | "replacement-owner-required";

export type UserManagementActionResult = {
  code: UserManagementResultCode;
  data?: UserManagementData;
  ok: boolean;
};

export type LoadUserManagementAction = () => Promise<UserManagementData>;
export type SaveManagedUserAction = (
  input: SaveManagedUserRequest,
) => Promise<UserManagementActionResult>;
export type ResetManagedUserPasswordAction = (
  input: ResetManagedUserPasswordRequest,
) => Promise<UserManagementActionResult>;
export type DeleteManagedUserAction = (
  input: DeleteManagedUserRequest,
) => Promise<UserManagementActionResult>;

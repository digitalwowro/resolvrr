import { HelpdeskConnectionStatus as DbConnectionStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import type { HelpdeskConnectionStatus } from "@/core/helpdesk-connections";
import type {
  StoredHelpdeskConnection,
  StoredWorkspace,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";

export const workspaceSelect = {
  id: true,
  ownerUserId: true,
  providerKey: true,
  displayName: true,
  baseUrl: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.WorkspaceSelect;

export const connectionSelect = {
  id: true,
  workspaceId: true,
  userId: true,
  status: true,
  providerIdentityExternalId: true,
  providerIdentityDisplayName: true,
  identityVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HelpdeskConnectionSelect;

export function toDbStatus(status: HelpdeskConnectionStatus): DbConnectionStatus {
  if (status === "auth_failed") return DbConnectionStatus.AUTH_FAILED;
  if (status === "disconnected") return DbConnectionStatus.DISCONNECTED;
  return DbConnectionStatus.ACTIVE;
}

function toDomainStatus(status: DbConnectionStatus): HelpdeskConnectionStatus {
  if (status === DbConnectionStatus.AUTH_FAILED) return "auth_failed";
  if (status === DbConnectionStatus.DISCONNECTED) return "disconnected";
  return "active";
}

export function toStoredWorkspace(workspace: StoredWorkspace): StoredWorkspace {
  return workspace;
}

export function toStoredConnection(connection: {
  id: string;
  workspaceId: string;
  userId: string;
  status: DbConnectionStatus;
  providerIdentityExternalId: string | null;
  providerIdentityDisplayName: string | null;
  identityVersion: string;
  createdAt: Date;
  updatedAt: Date;
}): StoredHelpdeskConnection {
  return { ...connection, status: toDomainStatus(connection.status) };
}

export function toWorkspaceAccess(access: {
  canEditAiRephraseStyleOverrides: boolean;
  canEditMyStyle: boolean;
  role: "ADMIN" | "AGENT";
}): WorkspaceAccess {
  return { ...access };
}

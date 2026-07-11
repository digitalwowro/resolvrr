import { HelpdeskConnectionStatus as DbConnectionStatus } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import type { HelpdeskConnectionStatus } from "@/core/helpdesk-connections";
import type {
  StoredHelpdeskConnection,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";

export const connectionSelect = {
  id: true,
  userId: true,
  providerKey: true,
  displayName: true,
  baseUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.HelpdeskConnectionSelect;

export function toDbStatus(status: HelpdeskConnectionStatus): DbConnectionStatus {
  if (status === "auth_failed") {
    return DbConnectionStatus.AUTH_FAILED;
  }
  if (status === "disconnected") {
    return DbConnectionStatus.DISCONNECTED;
  }
  return DbConnectionStatus.ACTIVE;
}

function toDomainStatus(status: DbConnectionStatus): HelpdeskConnectionStatus {
  if (status === DbConnectionStatus.AUTH_FAILED) {
    return "auth_failed";
  }
  if (status === DbConnectionStatus.DISCONNECTED) {
    return "disconnected";
  }
  return "active";
}

export function toStoredConnection(connection: {
  id: string;
  userId: string;
  providerKey: string;
  displayName: string;
  baseUrl: string;
  status: DbConnectionStatus;
  createdAt: Date;
  updatedAt: Date;
}): StoredHelpdeskConnection {
  return {
    ...connection,
    status: toDomainStatus(connection.status),
  };
}

function toWorkspaceAccess(access: {
  canEditAiRephraseStyleOverrides: boolean;
  canEditMyStyle: boolean;
  role: "ADMIN" | "AGENT";
}): WorkspaceAccess {
  return {
    canEditAiRephraseStyleOverrides: access.canEditAiRephraseStyleOverrides,
    canEditMyStyle: access.canEditMyStyle,
    role: access.role,
  };
}

export async function findWorkspaceAccess(userId: string, connectionId: string) {
  const membership = await prisma.workspaceMembership.findUnique({
    where: {
      userId_helpdeskConnectionId: {
        helpdeskConnectionId: connectionId,
        userId,
      },
    },
    select: {
      canEditAiRephraseStyleOverrides: true,
      canEditMyStyle: true,
      role: true,
    },
  });
  return membership ? toWorkspaceAccess(membership) : null;
}

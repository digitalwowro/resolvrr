"use server";

import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaMyStyleRepository } from "@/data/my-style-repository";
import { activeWorkspace } from "./settings-service";
import { loadMyStyle, resetMyStyle, saveMyStyle } from "./my-style-service";

export async function loadMyStyleAction() {
  const user = await requireCurrentUser();
  const workspace = await activeWorkspace(
    prismaHelpdeskConnectionsRepository,
    user.id,
  );
  return loadMyStyle({
    activeWorkspaceLabel: workspace?.label,
    canEdit: workspace?.access.canEditMyStyle,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    helpdeskConnectionId: workspace?.id,
    repository: prismaMyStyleRepository,
    userId: user.id,
  });
}

export async function saveMyStyleAction(formData: FormData) {
  const user = await requireCurrentUser();
  const workspace = await activeWorkspace(
    prismaHelpdeskConnectionsRepository,
    user.id,
  );
  return saveMyStyle({
    activeWorkspaceLabel: workspace?.label,
    canEdit: workspace?.access.canEditMyStyle,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    formData,
    helpdeskConnectionId: workspace?.id,
    repository: prismaMyStyleRepository,
    userId: user.id,
  });
}

export async function resetMyStyleAction() {
  const user = await requireCurrentUser();
  const workspace = await activeWorkspace(
    prismaHelpdeskConnectionsRepository,
    user.id,
  );
  return resetMyStyle({
    activeWorkspaceLabel: workspace?.label,
    canEdit: workspace?.access.canEditMyStyle,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    helpdeskConnectionId: workspace?.id,
    repository: prismaMyStyleRepository,
    userId: user.id,
  });
}

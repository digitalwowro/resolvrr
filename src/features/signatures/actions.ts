"use server";

import { revalidatePath } from "next/cache";
import { requireCurrentUser } from "@/auth/current-user";
import { env } from "@/config/env";
import { prismaHelpdeskConnectionsRepository } from "@/data/helpdesk-connections-repository";
import { prismaWorkspaceSignatureRepository } from "@/data/workspace-signature-repository";
import { providerRegistry } from "@/providers";
import { loadActiveTicketProviderContext } from "@/features/tickets/connection-context";
import { dispatchTicketLookupDataRead } from "@/features/tickets/ticket-lookup-service";
import type {
  TicketSignaturePreviewResult,
  WorkspaceSignatureSettingsData,
  WorkspaceSignatureSettingsResult,
} from "./model";
import {
  resolveWorkspaceTicketSignature,
  saveWorkspaceSignatureTemplate,
  validTicketSignatureSource,
} from "./service";
import { workspaceSignatureSettingsData } from "./settings-service";

async function activeAccess(userId: string) {
  const workspaceId = await prismaHelpdeskConnectionsRepository.getActiveWorkspaceId(userId);
  if (!workspaceId) return undefined;
  const access = await prismaHelpdeskConnectionsRepository.getAccess(userId, workspaceId);
  return access ? { access, workspaceId } : undefined;
}

async function loadSettings(userId: string): Promise<WorkspaceSignatureSettingsData> {
  const active = await activeAccess(userId);
  if (!active) {
    return { canManage: false, groupOptions: [], source: "none", templates: [], workspaceLabel: "No active workspace" };
  }
  const providerContext = await loadActiveTicketProviderContext(
    prismaHelpdeskConnectionsRepository, providerRegistry,
    env.APP_ENCRYPTION_KEY, userId, "list",
  );
  const lookups = providerContext.status === "available"
    ? await dispatchTicketLookupDataRead(providerContext.value, {
        assignableUsers: false,
      })
    : undefined;
  return (await workspaceSignatureSettingsData({
    access: active.access,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    groupOptions: lookups?.groups.status === "available" ? lookups.groups.options : [],
    repository: prismaWorkspaceSignatureRepository,
    workspaceId: active.workspaceId,
  })) ?? { canManage: false, groupOptions: [], source: "none", templates: [], workspaceLabel: "Workspace" };
}

async function result(userId: string, ok: boolean, message: string): Promise<WorkspaceSignatureSettingsResult> {
  return { data: await loadSettings(userId), message, ok };
}

export async function loadWorkspaceSignatureSettingsAction() {
  const user = await requireCurrentUser();
  return loadSettings(user.id);
}

export async function saveWorkspaceSignatureSourceAction(source: unknown) {
  const user = await requireCurrentUser();
  const active = await activeAccess(user.id);
  if (!active || active.access.role !== "ADMIN" || !validTicketSignatureSource(source)) {
    return result(user.id, false, "Signature settings could not be updated.");
  }
  await prismaWorkspaceSignatureRepository.setSource(active.workspaceId, source);
  revalidatePath("/workspace");
  return result(user.id, true, "Outbound signature source updated.");
}

function normalizedGroupExternalId(value: unknown) {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized && normalized.length <= 128 && !/[\0\r\n]/u.test(normalized)
    ? normalized : null;
}

async function groupIsAvailable(userId: string, groupExternalId: string | undefined) {
  if (!groupExternalId) return true;
  const settings = await loadSettings(userId);
  return settings.groupOptions.some((group) => group.externalId === groupExternalId);
}

export async function saveWorkspaceSignatureTemplateAction(input: {
  bodyHtml?: unknown;
  groupExternalId?: unknown;
}) {
  const user = await requireCurrentUser();
  const active = await activeAccess(user.id);
  const groupExternalId = normalizedGroupExternalId(input.groupExternalId);
  if (
    !active || active.access.role !== "ADMIN" || groupExternalId === null ||
    typeof input.bodyHtml !== "string" ||
    !(await groupIsAvailable(user.id, groupExternalId))
  ) return result(user.id, false, "Signature template could not be saved.");
  const saved = await saveWorkspaceSignatureTemplate({
    bodyHtml: input.bodyHtml,
    createdByUserId: user.id,
    encryptionKey: env.APP_ENCRYPTION_KEY,
    groupExternalId,
    repository: prismaWorkspaceSignatureRepository,
    workspaceId: active.workspaceId,
  });
  if (saved) revalidatePath("/workspace");
  return result(user.id, saved, saved ? "Signature template saved." : "Add valid signature content under 750 KB.");
}

export async function deleteWorkspaceSignatureTemplateAction(input: {
  groupExternalId?: unknown;
}) {
  const user = await requireCurrentUser();
  const active = await activeAccess(user.id);
  const groupExternalId = normalizedGroupExternalId(input.groupExternalId);
  if (
    !active || active.access.role !== "ADMIN" || groupExternalId === null ||
    !(await groupIsAvailable(user.id, groupExternalId))
  ) {
    return result(user.id, false, "Signature template could not be removed.");
  }
  const deleted = await prismaWorkspaceSignatureRepository.deleteTemplate(
    active.workspaceId, groupExternalId,
  );
  if (deleted) revalidatePath("/workspace");
  return result(user.id, deleted, deleted ? "Signature template removed." : "Signature template was not found.");
}

export async function loadTicketSignaturePreviewAction(input: {
  groupExternalId?: string;
  ticketExternalId: string;
}): Promise<TicketSignaturePreviewResult> {
  const user = await requireCurrentUser();
  const groupExternalId = normalizedGroupExternalId(input.groupExternalId);
  if (
    !input.ticketExternalId?.trim() ||
    groupExternalId === null
  ) return { status: "unavailable", message: "The signature context is invalid.", retryable: false };
  const providerContext = await loadActiveTicketProviderContext(
    prismaHelpdeskConnectionsRepository, providerRegistry,
    env.APP_ENCRYPTION_KEY, user.id, "detail",
  );
  if (providerContext.status === "unavailable") {
    return { status: "unavailable", message: "The signature could not be loaded from the active workspace.", retryable: providerContext.retryable };
  }
  try {
    const signature = await resolveWorkspaceTicketSignature({
      encryptionKey: env.APP_ENCRYPTION_KEY,
      groupExternalId,
      providerContext: providerContext.value,
      repository: prismaWorkspaceSignatureRepository,
      ticketExternalId: input.ticketExternalId.trim(),
      userId: user.id,
    });
    return { status: "available", signature };
  } catch {
    return { status: "unavailable", message: "The signature could not be loaded. Retry before updating the ticket.", retryable: true };
  }
}

import { randomUUID } from "node:crypto";
import type { WorkspaceSignatureSource as DbSignatureSource } from "@/generated/prisma/client";
import { prisma } from "@/data/prisma";
import type {
  WorkspaceSignatureRepository,
} from "@/features/signatures/repository";
import type { TicketSignatureSource } from "@/core/ticket-signatures";

const sourceToDb: Record<TicketSignatureSource, DbSignatureSource> = {
  none: "NONE",
  resolvrr: "RESOLVRR",
  zammad: "ZAMMAD",
};

const sourceFromDb: Record<DbSignatureSource, TicketSignatureSource> = {
  NONE: "none",
  RESOLVRR: "resolvrr",
  ZAMMAD: "zammad",
};

function scopeKey(groupExternalId?: string) {
  return groupExternalId ? `group:${groupExternalId}` : "default";
}

export const prismaWorkspaceSignatureRepository: WorkspaceSignatureRepository = {
  async getConfiguration(workspaceId) {
    const row = await prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: {
        displayName: true,
        signatureSource: true,
        signatureVersion: true,
        signatureTemplates: {
          select: {
            id: true, contextVersion: true, encryptedBodyHtml: true,
            groupExternalId: true, keyVersion: true,
          },
          orderBy: [{ groupExternalId: "asc" }],
        },
      },
    });
    if (!row) return null;
    return {
      contextVersion: row.signatureVersion,
      source: sourceFromDb[row.signatureSource],
      templates: row.signatureTemplates.map((template) => ({
        ...template,
        groupExternalId: template.groupExternalId ?? undefined,
      })),
      workspaceDisplayName: row.displayName,
    };
  },
  async getUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { displayName: true, email: true, firstName: true, lastName: true },
    });
    return user ? {
      displayName: user.displayName ?? undefined,
      email: user.email,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
    } : null;
  },
  async setSource(workspaceId, source) {
    await prisma.workspace.update({
      where: { id: workspaceId },
      data: { signatureSource: sourceToDb[source], signatureVersion: randomUUID() },
    });
  },
  async upsertTemplate(input) {
    await prisma.$transaction(async (tx) => {
      const template = await tx.workspaceSignatureTemplate.upsert({
        where: { workspaceId_scopeKey: {
          workspaceId: input.workspaceId,
          scopeKey: scopeKey(input.groupExternalId),
        } },
        create: {
          contextVersion: input.contextVersion,
          encryptedBodyHtml: input.encryptedBodyHtml,
          groupExternalId: input.groupExternalId,
          keyVersion: input.keyVersion,
          scopeKey: scopeKey(input.groupExternalId),
          workspaceId: input.workspaceId,
        },
        update: {
          contextVersion: input.contextVersion,
          encryptedBodyHtml: input.encryptedBodyHtml,
          keyVersion: input.keyVersion,
        },
        select: { id: true },
      });
      await tx.workspaceSignatureTemplateRevision.create({ data: {
        contextVersion: input.contextVersion,
        createdByUserId: input.createdByUserId,
        encryptedBodyHtml: input.encryptedBodyHtml,
        keyVersion: input.keyVersion,
        templateId: template.id,
      } });
      await tx.workspace.update({
        where: { id: input.workspaceId },
        data: { signatureVersion: randomUUID() },
      });
    });
  },
  async deleteTemplate(workspaceId, groupExternalId) {
    const template = await prisma.workspaceSignatureTemplate.findUnique({
      where: { workspaceId_scopeKey: { workspaceId, scopeKey: scopeKey(groupExternalId) } },
      select: { id: true },
    });
    if (!template) return false;
    await prisma.$transaction([
      prisma.workspaceSignatureTemplate.delete({ where: { id: template.id } }),
      prisma.workspace.update({
        where: { id: workspaceId }, data: { signatureVersion: randomUUID() },
      }),
    ]);
    return true;
  },
};

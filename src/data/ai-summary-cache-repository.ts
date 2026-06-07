import { decryptSecret, encryptSecret } from "@/security/encryption";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import { cacheAgeBucket } from "@/telemetry/cache-age-bucket";
import { prisma } from "./prisma";

const summaryCacheTtlMs = 24 * 60 * 60 * 1000;

function expiresAt(now: Date) {
  return new Date(now.getTime() + summaryCacheTtlMs);
}

function identity(input: Parameters<AiSummaryCacheRepository["readSummary"]>[0]) {
  return {
    ai_summary_cache_identity: {
      helpdeskConnectionId: input.helpdeskConnectionId,
      modelFingerprint: input.modelFingerprint,
      operation: input.operation,
      promptVersion: input.promptVersion,
      providerProtocol: input.providerProtocol,
      providerTicketId: input.ticketExternalId,
      sanitizationVersion: input.sanitizationVersion,
      sourceFingerprint: input.sourceFingerprint,
      userId: input.userId,
    },
  };
}

export const prismaAiSummaryCacheRepository: AiSummaryCacheRepository = {
  enabled: true,

  async readSummary(input) {
    const now = input.now ?? new Date();
    const cached = await prisma.aiSummaryCache.findUnique({
      where: identity(input),
      select: {
        encryptedSummary: true,
        expiresAt: true,
        fetchedAt: true,
        generatedAt: true,
        sourceArticleCount: true,
        sourceTicketNumber: true,
        sourceTicketUpdatedAt: true,
      },
    });
    if (!cached) {
      return { status: "miss" };
    }

    const ageBucket = cacheAgeBucket({ fetchedAt: cached.fetchedAt, now });
    if (cached.expiresAt <= now) {
      return { ageBucket, status: "stale" };
    }

    return {
      ageBucket,
      result: {
        status: "available",
        generatedAt: cached.generatedAt.toISOString(),
        source: {
          articleCount: cached.sourceArticleCount,
          ticketNumber: cached.sourceTicketNumber,
          ticketUpdatedAt: cached.sourceTicketUpdatedAt?.toISOString() ?? "",
        },
        summary: decryptSecret(cached.encryptedSummary, input.encryptionKey),
      },
      status: "hit",
    };
  },

  async storeSummary(input) {
    const now = input.now ?? new Date();
    await prisma.aiSummaryCache.upsert({
      where: identity(input),
      create: {
        encryptedSummary: encryptSecret(input.result.summary, input.encryptionKey),
        expiresAt: expiresAt(now),
        fetchedAt: now,
        generatedAt: new Date(input.result.generatedAt),
        helpdeskConnectionId: input.helpdeskConnectionId,
        modelFingerprint: input.modelFingerprint,
        operation: input.operation,
        promptVersion: input.promptVersion,
        providerProtocol: input.providerProtocol,
        providerTicketId: input.ticketExternalId,
        sanitizationVersion: input.sanitizationVersion,
        sourceArticleCount: input.result.source.articleCount,
        sourceFingerprint: input.sourceFingerprint,
        sourceTicketNumber: input.result.source.ticketNumber,
        sourceTicketUpdatedAt: input.result.source.ticketUpdatedAt
          ? new Date(input.result.source.ticketUpdatedAt)
          : undefined,
        userId: input.userId,
      },
      update: {
        encryptedSummary: encryptSecret(input.result.summary, input.encryptionKey),
        expiresAt: expiresAt(now),
        fetchedAt: now,
        generatedAt: new Date(input.result.generatedAt),
        sourceArticleCount: input.result.source.articleCount,
        sourceTicketNumber: input.result.source.ticketNumber,
        sourceTicketUpdatedAt: input.result.source.ticketUpdatedAt
          ? new Date(input.result.source.ticketUpdatedAt)
          : undefined,
      },
    });
  },

  async invalidateTicket(input) {
    await prisma.aiSummaryCache.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        providerTicketId: input.ticketExternalId,
        userId: input.userId,
      },
    });
  },

  async invalidateConnection(input) {
    await prisma.aiSummaryCache.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
        userId: input.userId,
      },
    });
  },

  async invalidateWorkspace(input) {
    await prisma.aiSummaryCache.deleteMany({
      where: {
        helpdeskConnectionId: input.helpdeskConnectionId,
      },
    });
  },
};

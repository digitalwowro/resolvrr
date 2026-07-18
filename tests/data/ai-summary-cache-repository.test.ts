import { beforeEach, describe, expect, it, vi } from "vitest";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import {
  serializeTicketSummary,
} from "@/features/ai/ticket-summary-structure";
import type { TicketAiSummaryContent } from "@/features/ai/ticket-summary-content";

const prismaMocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  upsert: vi.fn(),
}));

vi.mock("@/data/prisma", () => ({
  prisma: {
    aiSummaryCache: {
      deleteMany: vi.fn(),
      findUnique: prismaMocks.findUnique,
      upsert: prismaMocks.upsert,
    },
  },
}));

import { prismaAiSummaryCacheRepository } from "@/data/ai-summary-cache-repository";

const encryptionKey = "0123456789abcdef0123456789abcdef";
const key = {
  encryptionKey,
  helpdeskConnectionId: "connection-1",
  modelFingerprint: "model-v1",
  operation: "ticket-summary" as const,
  promptVersion: "prompt-v1",
  providerProtocol: "openai-compatible" as const,
  sanitizationVersion: "sanitize-v1",
  sourceFingerprint: "source-v1",
  ticketExternalId: "59149",
  userId: "user-1",
};
const durableSummary: TicketAiSummaryContent = {
  schemaVersion: "ticket-summary-v2",
  situation: "Durable summary",
  timeline: [],
  nextRisk: null,
};

describe("Prisma AI summary cache repository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an exact matching summary regardless of its age", async () => {
    prismaMocks.findUnique.mockResolvedValueOnce({
      encryptedSummary: encryptSecret(
        serializeTicketSummary(durableSummary),
        encryptionKey,
      ),
      fetchedAt: new Date("2020-01-01T00:00:00.000Z"),
      generatedAt: new Date("2020-01-01T00:00:00.000Z"),
      sourceArticleCount: 13,
      sourceTicketNumber: "#59149",
      sourceTicketUpdatedAt: new Date("2019-12-31T23:00:00.000Z"),
    });

    const result = await prismaAiSummaryCacheRepository.readSummary({
      ...key,
      now: new Date("2026-07-18T10:00:00.000Z"),
    });

    expect(result).toMatchObject({
      result: {
        generatedAt: "2020-01-01T00:00:00.000Z",
        summary: durableSummary,
      },
      status: "hit",
    });
  });

  it("treats malformed structured cache content as a miss", async () => {
    prismaMocks.findUnique.mockResolvedValueOnce({
      encryptedSummary: encryptSecret(
        '{"schemaVersion":"ticket-summary-v2","situation":"Incomplete"}',
        encryptionKey,
      ),
      fetchedAt: new Date("2026-07-18T09:00:00.000Z"),
      generatedAt: new Date("2026-07-18T09:00:00.000Z"),
      sourceArticleCount: 13,
      sourceTicketNumber: "#59149",
      sourceTicketUpdatedAt: new Date("2026-07-16T14:04:09.189Z"),
    });

    await expect(prismaAiSummaryCacheRepository.readSummary(key))
      .resolves.toEqual({ status: "miss" });
  });

  it("stores fingerprinted summaries without a time-based expiry", async () => {
    prismaMocks.upsert.mockResolvedValueOnce({});
    await prismaAiSummaryCacheRepository.storeSummary({
      ...key,
      now: new Date("2026-07-18T10:00:00.000Z"),
      result: {
        generatedAt: "2026-07-18T09:00:00.000Z",
        source: {
          articleCount: 13,
          ticketNumber: "#59149",
          ticketUpdatedAt: "2026-07-16T14:04:09.189Z",
        },
        status: "available",
        summary: { ...durableSummary, situation: "Stored summary" },
      },
    });

    const call = prismaMocks.upsert.mock.calls[0]?.[0];
    expect(call.create).not.toHaveProperty("expiresAt");
    expect(call.update).not.toHaveProperty("expiresAt");
    expect(JSON.parse(decryptSecret(call.create.encryptedSummary, encryptionKey)))
      .toEqual({ ...durableSummary, situation: "Stored summary" });
  });
});

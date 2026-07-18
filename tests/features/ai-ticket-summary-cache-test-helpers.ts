import { vi } from "vitest";
import type { TicketDetail } from "@/core/tickets";
import type { AiSummaryCacheRepository } from "@/features/ai/summary-cache-repository";
import type { TicketAiSummaryContent } from "@/features/ai/ticket-summary-content";

export function ticketDetail(): TicketDetail {
  return {
    links: [],
    measuredAt: new Date("2026-05-24T08:35:00Z"),
    subscription: { supported: false, following: false },
    thread: {
      ticketExternalId: "ticket-1",
      articles: [
        {
          attachments: [],
          author: { name: "Maya Patel", email: "maya@example.com" },
          createdAt: new Date("2026-05-24T08:31:00Z"),
          direction: "inbound",
          externalId: "article-secret-1",
          kind: "message",
          recipients: [],
          sanitizedHtml:
            "<p>Hello <strong>support</strong></p><script>ignored()</script>",
          visibility: "public",
        },
      ],
    },
    ticket: {
      customer: { name: "Maya Patel", email: "maya@example.com" },
      externalId: "ticket-1",
      group: { name: "Users" },
      number: "1001",
      owner: { name: "Agent Smith", email: "agent@example.com" },
      priority: "medium",
      state: "open",
      tags: ["login"],
      title: "Cannot log in",
      updatedAt: new Date("2026-05-24T08:30:00Z"),
    },
  };
}

export function aiCacheRepository(
  overrides: Partial<AiSummaryCacheRepository> = {},
): AiSummaryCacheRepository {
  return {
    enabled: true,
    invalidateConnection: vi.fn(async () => undefined),
    invalidateTicket: vi.fn(async () => undefined),
    invalidateWorkspace: vi.fn(async () => undefined),
    readSummary: vi.fn(async () => ({ status: "miss" as const })),
    storeSummary: vi.fn(async () => undefined),
    ...overrides,
  };
}

export const cacheScope = {
  helpdeskConnectionId: "connection-1",
  ticketExternalId: "ticket-1",
  userId: "user-1",
};

export const openAiConfig = {
  status: "available" as const,
  apiKey: "openai-key",
  baseUrl: "https://api.openai.test/v1",
  model: "support-model",
  provider: "openai-compatible" as const,
};

export function ticketSummaryContent(
  situation: string,
  overrides: Partial<TicketAiSummaryContent> = {},
): TicketAiSummaryContent {
  return {
    schemaVersion: "ticket-summary-v2",
    situation,
    timeline: [],
    nextRisk: null,
    ...overrides,
  };
}

export function ticketSummaryJson(
  situation: string,
  overrides: Partial<TicketAiSummaryContent> = {},
): string {
  return JSON.stringify(ticketSummaryContent(situation, overrides));
}

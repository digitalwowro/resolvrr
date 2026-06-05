import { beforeEach, describe, expect, it, vi } from "vitest";
import { summarizeWorkspaceTicketAction } from "@/features/ai/ticket-summary-actions";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/config/env", () => ({
  env: {
    AI_ANTHROPIC_BASE_URL: "https://api.anthropic.com/v1",
    AI_PROVIDER: "disabled",
    AI_OPENAI_BASE_URL: "https://api.openai.com/v1",
    APP_ENCRYPTION_KEY: "test encryption key long enough",
  },
}));

vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {},
}));

vi.mock("@/data/ticket-detail-cache-repository", () => ({
  prismaTicketDetailCacheRepository: { enabled: true },
}));

vi.mock("@/providers", () => ({
  providerRegistry: {},
}));

vi.mock("@/features/tickets/service", () => ({
  loadWorkspaceTicketDetail: vi.fn(),
}));

const mockedLoadWorkspaceTicketDetail = vi.mocked(loadWorkspaceTicketDetail);

describe("summarizeWorkspaceTicketAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reloads provider-neutral ticket detail server-side before summarizing", async () => {
    mockedLoadWorkspaceTicketDetail.mockResolvedValueOnce({
      status: "available",
      detail: {
        links: [],
        measuredAt: new Date("2026-05-24T08:35:00Z"),
        subscription: { supported: false, following: false },
        thread: {
          ticketExternalId: "ticket-1",
          articles: [],
        },
        ticket: {
          externalId: "ticket-1",
          number: "1001",
          tags: [],
          title: "Cannot log in",
          updatedAt: new Date("2026-05-24T08:30:00Z"),
        },
      },
    });

    await expect(
      summarizeWorkspaceTicketAction({ ticketExternalId: " ticket-1 " }),
    ).resolves.toEqual({
      status: "unconfigured",
      reason: "ai-disabled",
      retryable: false,
    });

    expect(mockedLoadWorkspaceTicketDetail).toHaveBeenCalledWith(
      {},
      {},
      "test encryption key long enough",
      "user-1",
      "ticket-1",
      { enabled: true },
    );
  });

  it("does not call ticket reads for blank requests", async () => {
    await expect(
      summarizeWorkspaceTicketAction({ ticketExternalId: " " }),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "ticket-unavailable",
      retryable: false,
    });

    expect(mockedLoadWorkspaceTicketDetail).not.toHaveBeenCalled();
  });
});

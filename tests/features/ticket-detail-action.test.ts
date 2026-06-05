import { beforeEach, describe, expect, it, vi } from "vitest";
import { loadWorkspaceTicketDetailAction } from "@/features/tickets/detail-actions";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/config/env", () => ({
  env: { APP_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef" },
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

describe("loadWorkspaceTicketDetailAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns adapted workspace detail instead of raw provider read data", async () => {
    mockedLoadWorkspaceTicketDetail.mockResolvedValueOnce({
      status: "available",
      detail: {
        ticket: {
          externalId: "ticket-1",
          number: "#1001",
          title: "Cannot log in",
          customer: { name: "Maya Patel", email: "maya@example.com" },
          owner: { name: "Agent Smith", email: "agent@example.com" },
          group: { name: "Users" },
          state: "open",
          priority: "medium",
          updatedAt: new Date("2026-05-24T08:30:00Z"),
          tags: ["login"],
        },
        thread: {
          ticketExternalId: "ticket-1",
          articles: [
            {
              externalId: "article-1",
              kind: "message",
              visibility: "public",
              direction: "inbound",
              author: { name: "Maya Patel", email: "maya@example.com" },
              recipients: [],
              createdAt: new Date("2026-05-24T08:31:00Z"),
              sanitizedHtml: "<p>Hello</p>",
              attachments: [],
            },
          ],
        },
        links: [],
        subscription: { supported: false, following: false },
        measuredAt: new Date("2026-05-24T08:31:30Z"),
      },
    });

    const result = await loadWorkspaceTicketDetailAction(" ticket-1 ");

    expect(mockedLoadWorkspaceTicketDetail).toHaveBeenCalledWith(
      {},
      {},
      "0123456789abcdef0123456789abcdef",
      "user-1",
      "ticket-1",
      { enabled: true },
    );
    expect(result).toMatchObject({
      status: "available",
      detail: {
        id: "ticket-1",
        number: "#1001",
        title: "Cannot log in",
        customer: "Maya Patel",
        articles: [{ id: "article-1", sanitizedHtml: "<p>Hello</p>" }],
      },
    });
    expect(result.status).toBe("available");
    if (result.status !== "available") {
      throw new Error("Expected available detail");
    }
    expect("ticket" in result.detail).toBe(false);
    expect("thread" in result.detail).toBe(false);
    expect("measuredAt" in result.detail).toBe(false);
  });

  it("passes through only unavailable reason and retryability", async () => {
    mockedLoadWorkspaceTicketDetail.mockResolvedValueOnce({
      status: "unavailable",
      reason: "provider-auth-failed",
      retryable: false,
    });

    await expect(loadWorkspaceTicketDetailAction("ticket-1")).resolves.toEqual({
      status: "unavailable",
      reason: "provider-auth-failed",
      retryable: false,
    });
  });
});

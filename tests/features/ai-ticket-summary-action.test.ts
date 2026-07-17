import { beforeEach, describe, expect, it, vi } from "vitest";
import { summarizeWorkspaceTicketAction } from "@/features/ai/ticket-summary-actions";
import { resolveWorkspaceAiRuntimeConfig } from "@/features/ai/settings-service";
import { summarizeTicketDetail } from "@/features/ai/ticket-summary-service";
import { loadWorkspaceTicketDetail } from "@/features/tickets/service";

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/config/env", () => ({
  env: {
    APP_ENCRYPTION_KEY: "test encryption key long enough",
  },
}));

vi.mock("@/data/ai-settings-repository", () => ({
  prismaAiSettingsRepository: {
    getUserSetting: vi.fn(async () => null),
    getWorkspaceSetting: vi.fn(async () => null),
  },
}));

vi.mock("@/data/ai-prompts-repository", () => ({
  prismaAiPromptRepository: {
    getUserPromptOverride: vi.fn(async () => null),
    getWorkspacePrompt: vi.fn(async () => null),
  },
}));

vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {},
}));

vi.mock("@/data/ai-summary-cache-repository", () => ({
  prismaAiSummaryCacheRepository: { enabled: true },
}));

vi.mock("@/data/ticket-detail-cache-repository", () => ({
  prismaTicketDetailCacheRepository: { enabled: true },
}));

vi.mock("@/providers", () => ({
  providerRegistry: {},
}));

vi.mock("@/features/ai/settings-service", () => ({
  resolveWorkspaceAiRuntimeConfig: vi.fn(),
}));

vi.mock("@/features/ai/ticket-summary-service", () => ({
  summarizeTicketDetail: vi.fn(),
}));

vi.mock("@/features/tickets/service", () => ({
  loadWorkspaceTicketDetail: vi.fn(),
}));

const mockedLoadWorkspaceTicketDetail = vi.mocked(loadWorkspaceTicketDetail);
const mockedResolveWorkspaceAiRuntimeConfig = vi.mocked(
  resolveWorkspaceAiRuntimeConfig,
);
const mockedSummarizeTicketDetail = vi.mocked(summarizeTicketDetail);

describe("summarizeWorkspaceTicketAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedResolveWorkspaceAiRuntimeConfig.mockResolvedValue({
      status: "unconfigured",
      reason: "ai-disabled",
    });
    mockedSummarizeTicketDetail.mockImplementation(async (config) =>
      config.status === "unconfigured"
        ? {
            status: "unconfigured",
            reason: config.reason,
            retryable: false,
          }
        : {
            status: "unavailable",
            reason: "provider-temporary-failure",
            retryable: true,
          },
    );
  });

  it("reloads provider-neutral ticket detail server-side before summarizing", async () => {
    mockedLoadWorkspaceTicketDetail.mockResolvedValueOnce({
      status: "available",
      helpdeskConnectionId: "connection-1",
      workspaceId: "workspace-1",
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
      summarizeWorkspaceTicketAction({
        helpdeskConnectionId: "connection-1",
        ticketExternalId: " ticket-1 ",
        workspaceId: "workspace-1",
      }),
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
      {
        cacheMode: "bypass",
        helpdeskConnectionId: "connection-1",
        workspaceId: "workspace-1",
      },
    );
  });

  it("does not call ticket reads for blank requests", async () => {
    await expect(
      summarizeWorkspaceTicketAction({
        helpdeskConnectionId: "connection-1",
        ticketExternalId: " ",
        workspaceId: "workspace-1",
      }),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "ticket-unavailable",
      retryable: false,
    });

    expect(mockedLoadWorkspaceTicketDetail).not.toHaveBeenCalled();
  });

  it("rejects detail resolved outside the requested workspace scope", async () => {
    mockedLoadWorkspaceTicketDetail.mockResolvedValueOnce({
      status: "available",
      helpdeskConnectionId: "connection-2",
      workspaceId: "workspace-2",
      detail: {
        links: [],
        measuredAt: new Date("2026-05-24T08:35:00Z"),
        subscription: { supported: false, following: false },
        thread: { ticketExternalId: "ticket-1", articles: [] },
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
      summarizeWorkspaceTicketAction({
        helpdeskConnectionId: "connection-1",
        ticketExternalId: "ticket-1",
        workspaceId: "workspace-1",
      }),
    ).resolves.toEqual({
      status: "unavailable",
      reason: "ticket-unavailable",
      retryable: false,
    });

    expect(mockedResolveWorkspaceAiRuntimeConfig).not.toHaveBeenCalled();
    expect(mockedSummarizeTicketDetail).not.toHaveBeenCalled();
  });

  it("re-resolves the scoped configuration and retries one authentication failure", async () => {
    mockedLoadWorkspaceTicketDetail.mockResolvedValueOnce({
      status: "available",
      helpdeskConnectionId: "connection-1",
      workspaceId: "workspace-1",
      detail: {
        links: [],
        measuredAt: new Date("2026-05-24T08:35:00Z"),
        subscription: { supported: false, following: false },
        thread: { ticketExternalId: "ticket-1", articles: [] },
        ticket: {
          externalId: "ticket-1",
          number: "1001",
          tags: [],
          title: "Cannot log in",
          updatedAt: new Date("2026-05-24T08:30:00Z"),
        },
      },
    });
    mockedResolveWorkspaceAiRuntimeConfig
      .mockResolvedValueOnce({
        status: "available",
        apiKey: "first-key",
        baseUrl: "https://api.example.test/v1",
        configurationVersion: "version-1",
        model: "summary-model",
        provider: "openai-compatible",
      })
      .mockResolvedValueOnce({
        status: "available",
        apiKey: "second-key",
        baseUrl: "https://api.example.test/v1",
        configurationVersion: "version-2",
        model: "summary-model",
        provider: "openai-compatible",
      });
    mockedSummarizeTicketDetail
      .mockResolvedValueOnce({
        status: "unavailable",
        reason: "provider-auth-failed",
        retryable: false,
      })
      .mockResolvedValueOnce({
        status: "available",
        generatedAt: "2026-05-24T08:40:00.000Z",
        source: {
          articleCount: 1,
          ticketNumber: "1001",
          ticketUpdatedAt: "2026-05-24T08:30:00.000Z",
        },
        summary: "Recovered summary",
      });

    await expect(
      summarizeWorkspaceTicketAction({
        helpdeskConnectionId: "connection-1",
        ticketExternalId: "ticket-1",
        workspaceId: "workspace-1",
      }),
    ).resolves.toMatchObject({
      status: "available",
      summary: "Recovered summary",
    });

    expect(mockedResolveWorkspaceAiRuntimeConfig).toHaveBeenCalledTimes(2);
    expect(mockedResolveWorkspaceAiRuntimeConfig).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        getUserSetting: expect.any(Function),
        getWorkspaceSetting: expect.any(Function),
      }),
      "test encryption key long enough",
      "user-1",
      "workspace-1",
    );
    expect(mockedSummarizeTicketDetail).toHaveBeenCalledTimes(2);
  });
});

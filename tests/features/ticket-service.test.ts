import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
} from "@/features/helpdesk-connections/repository";
import {
  loadWorkspaceTicketDetail,
  loadWorkspaceTicketList,
} from "@/features/tickets";
import { encryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

const encryptionKey = "0123456789abcdef0123456789abcdef";
const mockedValidateProviderBaseUrl = vi.mocked(validateProviderBaseUrl);

function credential(payload = { username: "agent", password: "secret" }) {
  return {
    scheme: "basic-auth",
    keyVersion: "v1",
    encryptedPayload: encryptSecret(JSON.stringify(payload), encryptionKey),
  };
}

function connection(
  overrides: Partial<HelpdeskConnectionWithCredential> = {},
): HelpdeskConnectionWithCredential {
  return {
    id: "connection-1",
    userId: "user-1",
    providerKey: "test-provider",
    displayName: "Support",
    baseUrl: "https://helpdesk.example.com",
    status: "active",
    createdAt: new Date("2026-05-24T00:00:00Z"),
    updatedAt: new Date("2026-05-24T00:00:00Z"),
    credential: credential(),
    ...overrides,
  };
}

function repository(input: {
  activeConnectionId?: string | null;
  connection?: HelpdeskConnectionWithCredential | null;
}): HelpdeskConnectionsRepository {
  return {
    listForUser: async () => [],
    findForUser: async () => input.connection ?? null,
    create: async () => {
      throw new Error("not implemented");
    },
    update: async () => null,
    updateStatus: async () => false,
    deleteForUser: async () => false,
    getActiveConnectionId: async () => input.activeConnectionId ?? null,
    setActiveConnectionId: async () => undefined,
    clearActiveConnectionId: async () => undefined,
  };
}

function provider(
  overrides: Partial<HelpdeskProviderPlugin> = {},
): HelpdeskProviderPlugin {
  return {
    key: "test-provider",
    label: "Test Provider",
    capabilities: ["ticket:list", "ticket:detail"],
    credentialSchemes: [],
    validateConnection: async () => undefined,
    listTickets: async () => ({
      tickets: [
        {
          externalId: "ticket-1",
          number: "1",
          title: "First ticket",
          updatedAt: new Date("2026-05-24T00:00:00Z"),
          tags: [],
        },
      ],
      loadedCount: 1,
      measuredAt: new Date("2026-05-24T00:00:00Z"),
    }),
    getTicketDetail: async (_context, ticketExternalId) => ({
      ticket: {
        externalId: ticketExternalId,
        number: "1",
        title: "First ticket",
        updatedAt: new Date("2026-05-24T00:00:00Z"),
        tags: [],
      },
      thread: { ticketExternalId, articles: [] },
      links: [],
      subscription: { supported: false, following: false },
      measuredAt: new Date("2026-05-24T00:00:00Z"),
    }),
    ...overrides,
  };
}

describe("ticket read service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateProviderBaseUrl.mockResolvedValue({
      canonicalUrl: "https://helpdesk.example.com",
      addresses: ["93.184.216.34"],
    });
  });

  it("returns an unavailable state when no active connection exists", async () => {
    const result = await loadWorkspaceTicketList(
      repository({ activeConnectionId: null }),
      createProviderRegistry([provider()]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "no-active-connection",
    });
  });

  it.each([
    ["inactive-connection", connection({ status: "disconnected" })],
    ["missing-credentials", connection({ credential: null })],
    ["unknown-provider", connection({ providerKey: "missing-provider" })],
  ])("returns %s before calling the provider", async (reason, storedConnection) => {
    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: storedConnection,
      }),
      createProviderRegistry([provider()]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({ status: "unavailable", reason });
  });

  it("passes decrypted credentials and validated addresses to provider reads", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const listTickets = vi.fn(provider().listTickets);

    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({
      status: "available",
      connectionName: "Support",
      metadataMutationCapabilities: { state: false, priority: false },
    });
    expect(listTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "secret" },
        requestSecurity: { validatedAddresses: ["93.184.216.34"] },
      }),
      expect.objectContaining({ pageSize: 25 }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "active-connection-lookup",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "base-url-security-revalidation",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "credential-decrypt",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "total-list-load",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
  });

  it("normalizes canonical list query and returns count and bucket metadata", async () => {
    const listTickets = vi.fn(async () => ({
      tickets: [],
      loadedCount: 0,
      totalCount: 12,
      buckets: [
        {
          key: "state" as const,
          value: "open",
          label: "Open",
          tickets: [],
          loadedCount: 0,
          totalCount: 12,
        },
      ],
      measuredAt: new Date("2026-05-24T00:00:00Z"),
    }));

    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:count",
            "ticket:sort",
            "ticket:group",
            "ticket:group-count",
          ],
          listTickets,
        }),
      ]),
      encryptionKey,
      "user-1",
      {
        filter: { states: ["open"] },
        pageSize: 5,
        cursor: "cursor-1",
        sort: { key: "priority", direction: "ascending" },
        count: { includeTotal: true },
        group: { key: "state" },
      },
    );

    expect(listTickets).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        filter: { states: ["open"] },
        pageSize: 5,
        cursor: "cursor-1",
        sort: { key: "priority", direction: "ascending" },
        count: { includeTotal: true },
        group: { key: "state" },
      }),
    );
    expect(result).toMatchObject({
      status: "available",
      queryCapabilities: {
        totalCount: true,
        providerSort: true,
        providerGrouping: true,
        groupedTotalCount: true,
        fullTextSearch: false,
        maxPageSize: 50,
        unsupportedCombinations: [],
      },
      loadedCount: 0,
      totalCount: 12,
      buckets: [{ key: "state", value: "open", totalCount: 12 }],
    });
  });

  it("returns an unsupported query state before calling providers without query capabilities", async () => {
    const listTickets = vi.fn(provider().listTickets);

    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
      { count: { includeTotal: true } },
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "unsupported-query",
      queryRejection: { kind: "count-unsupported" },
    });
    expect(listTickets).not.toHaveBeenCalled();
  });

  it("constrains oversized page requests before provider dispatch", async () => {
    const listTickets = vi.fn(provider().listTickets);

    await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
      { pageSize: 500 },
    );

    expect(listTickets).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ pageSize: 50 }),
    );
  });

  it("dispatches only canonical list query fields to provider plugins", async () => {
    const listTickets = vi.fn(provider().listTickets);

    await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
      {
        pageSize: 10,
        zammadQuery: "state.name:open",
        rawProviderParams: { state_id: 2 },
      } as unknown as Parameters<typeof loadWorkspaceTicketList>[4],
    );

    const dispatchedQuery = listTickets.mock.calls[0]?.[1];

    expect(dispatchedQuery).toEqual({
      filter: {},
      pageSize: 10,
      sort: { key: "updatedAt", direction: "descending" },
    });
    expect("zammadQuery" in dispatchedQuery).toBe(false);
    expect("rawProviderParams" in dispatchedQuery).toBe(false);
  });

  it("maps unsupported capabilities to an unavailable state", async () => {
    const result = await loadWorkspaceTicketDetail(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ capabilities: ["ticket:list"] })]),
      encryptionKey,
      "user-1",
      "ticket-1",
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "unsupported-capability",
    });
  });

  it.each([
    [
      new ProviderError("credential-auth-failure", "auth rejected"),
      "provider-auth-failed",
    ],
    [new ProviderError("permission-denied", "denied"), "provider-permission-denied"],
    [
      new ProviderError("rate-limited", "rate limited", true),
      "provider-rate-limited",
    ],
    [
      new ProviderError("temporary-provider-failure", "network", true),
      "provider-temporary-failure",
    ],
    [
      new ProviderError("provider-data-mismatch", "unexpected"),
      "provider-unexpected-response",
    ],
  ])("maps provider failure %s to %s", async (error, reason) => {
    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          listTickets: async () => {
            throw error;
          },
        }),
      ]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({ status: "unavailable", reason });
  });

});

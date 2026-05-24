import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
} from "@/features/helpdesk-connections/repository";
import { loadWorkspaceTicketDetail, loadWorkspaceTicketList } from "@/features/tickets";
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
    });
    expect(listTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "secret" },
        requestSecurity: { validatedAddresses: ["93.184.216.34"] },
      }),
      expect.objectContaining({ limit: 25 }),
    );
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

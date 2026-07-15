import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";
import { updateWorkspaceTicketMetadata } from "@/features/tickets";
import { encryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

const encryptionKey = "0123456789abcdef0123456789abcdef";
const mockedValidateProviderBaseUrl = vi.mocked(validateProviderBaseUrl);
const access: WorkspaceAccess = {
  canEditAiRephraseStyleOverrides: false,
  canEditMyStyle: true,
  role: "AGENT",
};

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
    workspaceId: "connection-1",
    userId: "user-1",
    providerKey: "test-provider",
    displayName: "Support",
    baseUrl: "https://helpdesk.example.com",
    status: "active",
    providerIdentityExternalId: "agent-1",
    providerIdentityDisplayName: "Agent One",
    identityVersion: "identity-v1",
    access,
    createdAt: new Date("2026-05-24T00:00:00Z"),
    updatedAt: new Date("2026-05-24T00:00:00Z"),
    credential: credential(),
    workspace: {
      id: "connection-1", ownerUserId: "user-1", providerKey: "test-provider",
      displayName: "Support", baseUrl: "https://helpdesk.example.com",
      createdAt: new Date("2026-05-24T00:00:00Z"),
      updatedAt: new Date("2026-05-24T00:00:00Z"),
    },
    ...overrides,
  } as HelpdeskConnectionWithCredential;
}

function repository(input: {
  activeConnectionId?: string | null;
  connection?: HelpdeskConnectionWithCredential | null;
}): HelpdeskConnectionsRepository {
  return {
    listForUser: async () => [],
    findForUser: async () => input.connection ?? null,
    findForUserWorkspace: async () => input.connection ?? null,
    findWorkspaceForUser: async () => input.connection
      ? { ...input.connection.workspace, access: input.connection.access, connection: input.connection }
      : null,
    getAccess: async () => input.connection?.access ?? null,
    create: async () => {
      throw new Error("not implemented");
    },
    createPersonalConnection: async () => null,
    updatePersonalConnection: async () => null,
    updateWorkspace: async () => null,
    update: async () => null,
    updateStatus: async () => false,
    deleteForUser: async () => false,
    getActiveWorkspaceId: async () => input.activeConnectionId ?? null,
    setActiveWorkspaceId: async () => undefined,
    clearActiveWorkspaceId: async () => undefined,
    updateWorkspaceAgentAiPermissions: async () => undefined,
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
    validateConnection: async () => ({ externalId: "agent-1", displayName: "Agent One" }),
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

describe("ticket metadata mutation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateProviderBaseUrl.mockResolvedValue({
      canonicalUrl: "https://helpdesk.example.com",
      addresses: ["93.184.216.34"],
    });
  });

  it("updates canonical ticket metadata and refreshes affected list and detail", async () => {
    const updateTicketMetadata = vi.fn().mockResolvedValue(undefined);
    const listTickets = vi.fn(provider().listTickets);
    const getTicketDetail = vi.fn(provider().getTicketDetail);

    const result = await updateWorkspaceTicketMetadata(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:update-state",
            "ticket:update-priority",
          ],
          getTicketDetail,
          listTickets,
          updateTicketMetadata,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { state: "closed", priority: "high" },
    );

    expect(result).toEqual({ status: "saved" });
    expect(updateTicketMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "secret" },
        requestSecurity: { validatedAddresses: ["93.184.216.34"] },
      }),
      "ticket-1",
      { state: "closed", priority: "high" },
    );
    expect(getTicketDetail).toHaveBeenCalledWith(expect.any(Object), "ticket-1");
    expect(listTickets).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ pageSize: 25 }),
    );
  });

  it("rejects ticket metadata mutation when provider capability is unavailable", async () => {
    const updateTicketMetadata = vi.fn().mockResolvedValue(undefined);

    const result = await updateWorkspaceTicketMetadata(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["ticket:list", "ticket:detail"],
          updateTicketMetadata,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { state: "closed" },
    );

    expect(result).toEqual({
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    });
    expect(updateTicketMetadata).not.toHaveBeenCalled();
  });

  it("rejects pending state mutations without a future pending time before provider writes", async () => {
    const updateTicketMetadata = vi.fn().mockResolvedValue(undefined);

    const result = await updateWorkspaceTicketMetadata(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["ticket:list", "ticket:detail", "ticket:update-state"],
          updateTicketMetadata,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { state: "pending_reminder" },
    );

    expect(result).toEqual({
      status: "failed",
      reason: "invalid-input",
      retryable: false,
    });
    expect(updateTicketMetadata).not.toHaveBeenCalled();
  });

  it("reports unavailable-transition for provider validation failures", async () => {
    const result = await updateWorkspaceTicketMetadata(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["ticket:list", "ticket:detail", "ticket:update-state"],
          updateTicketMetadata: async () => {
            throw new ProviderError(
              "validation-failure",
              "State transition is not available.",
            );
          },
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { state: "new" },
    );

    expect(result).toEqual({
      status: "failed",
      reason: "unavailable-transition",
      retryable: false,
    });
  });

  it("reports saved-refresh-failed when post-write provider refresh fails", async () => {
    const result = await updateWorkspaceTicketMetadata(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["ticket:list", "ticket:detail", "ticket:update-state"],
          getTicketDetail: async () => {
            throw new ProviderError("temporary-provider-failure", "network", true);
          },
          updateTicketMetadata: async () => undefined,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { state: "closed" },
    );

    expect(result).toEqual({
      status: "saved-refresh-failed",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });
});

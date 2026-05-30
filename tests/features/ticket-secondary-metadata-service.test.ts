import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
} from "@/features/helpdesk-connections/repository";
import { updateWorkspaceTicketMetadata } from "@/features/tickets";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import { encryptSecret } from "@/security/encryption";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

const encryptionKey = "secondary_metadata_test_key_0000";
const mockedValidateProviderBaseUrl = vi.mocked(validateProviderBaseUrl);

function credential(payload = { username: "agent", password: "secret" }) {
  return {
    scheme: "basic-auth",
    keyVersion: "v1",
    encryptedPayload: encryptSecret(JSON.stringify(payload), encryptionKey),
  };
}

function connection(): HelpdeskConnectionWithCredential {
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
  };
}

function repository(): HelpdeskConnectionsRepository {
  return {
    listForUser: async () => [],
    findForUser: async () => connection(),
    create: async () => {
      throw new Error("not implemented");
    },
    update: async () => null,
    updateStatus: async () => false,
    deleteForUser: async () => false,
    getActiveConnectionId: async () => "connection-1",
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
      tickets: [],
      loadedCount: 0,
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
      subscription: { supported: true, following: false },
      measuredAt: new Date("2026-05-24T00:00:00Z"),
    }),
    ...overrides,
  };
}

describe("ticket secondary metadata mutation service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedValidateProviderBaseUrl.mockResolvedValue({
      canonicalUrl: "https://helpdesk.example.com",
      addresses: ["93.184.216.34"],
    });
  });

  it("updates tags, links, and subscription through separate provider capabilities", async () => {
    const updateTicketMetadata = vi.fn().mockResolvedValue(undefined);

    const result = await updateWorkspaceTicketMetadata(
      repository(),
      createProviderRegistry([
        provider({
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:update-tags",
            "ticket:update-links",
            "ticket:update-subscription",
          ],
          updateTicketMetadata,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      {
        linkAddExternalId: "77",
        linkRemoveExternalIds: ["88"],
        subscriptionFollowing: true,
        tags: ["vip", "renewal"],
      },
    );

    expect(result).toEqual({ status: "saved" });
    expect(updateTicketMetadata).toHaveBeenCalledWith(
      expect.any(Object),
      "ticket-1",
      {
        linkAddExternalId: "77",
        linkRemoveExternalIds: ["88"],
        subscriptionFollowing: true,
        tags: ["vip", "renewal"],
      },
    );
  });

  it("rejects secondary metadata updates when any required capability is unavailable", async () => {
    const updateTicketMetadata = vi.fn().mockResolvedValue(undefined);

    const result = await updateWorkspaceTicketMetadata(
      repository(),
      createProviderRegistry([
        provider({
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:update-tags",
            "ticket:update-links",
          ],
          updateTicketMetadata,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      {
        subscriptionFollowing: true,
        tags: ["vip"],
      },
    );

    expect(result).toEqual({
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    });
    expect(updateTicketMetadata).not.toHaveBeenCalled();
  });
});

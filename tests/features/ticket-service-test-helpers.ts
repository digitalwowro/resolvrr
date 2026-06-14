import { vi } from "vitest";
import type { HelpdeskProviderPlugin } from "@/core/providers";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";
import { encryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";

export const encryptionKey = "0".repeat(32);
export const mockedValidateProviderBaseUrl = vi.mocked(validateProviderBaseUrl);

const defaultWorkspaceAccess: WorkspaceAccess = {
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

export function connection(
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
    access: defaultWorkspaceAccess,
    credential: credential(),
    ...overrides,
  };
}

export function repository(input: {
  activeConnectionId?: string | null;
  connection?: HelpdeskConnectionWithCredential | null;
}): HelpdeskConnectionsRepository {
  return {
    listForUser: async () => [],
    findForUser: async () => input.connection ?? null,
    getAccess: async () => input.connection?.access ?? null,
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

export function provider(
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

export function mockValidatedBaseUrl() {
  mockedValidateProviderBaseUrl.mockResolvedValue({
    canonicalUrl: "https://helpdesk.example.com",
    addresses: ["93.184.216.34"],
  });
}

import { vi } from "vitest";
import type { HelpdeskProviderPlugin } from "@/core/providers";
import type { TicketCustomerReplyInput } from "@/core/ticket-replies";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
  WorkspaceAccess,
} from "@/features/helpdesk-connections/repository";
import { encryptSecret } from "@/security/encryption";
import { validateProviderBaseUrl } from "@/security/base-url-validation";

export const encryptionKey = "0".repeat(32);
export const mockedValidateProviderBaseUrl = vi.mocked(validateProviderBaseUrl);

export function replyInput(
  body: string,
  overrides: Partial<TicketCustomerReplyInput> = {},
): TicketCustomerReplyInput {
  return {
    body,
    cc: [],
    contextVersion: "context-v1",
    intent: "reply",
    sourceArticleExternalId: "article-1",
    to: ["customer@example.com"],
    ...overrides,
  };
}

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
    workspaceId: "workspace-1",
    userId: "user-1",
    providerKey: "test-provider",
    displayName: "Support",
    baseUrl: "https://helpdesk.example.com",
    status: "active",
    providerIdentityExternalId: "agent-1",
    providerIdentityDisplayName: "Agent One",
    identityVersion: "identity-v1",
    createdAt: new Date("2026-05-24T00:00:00Z"),
    updatedAt: new Date("2026-05-24T00:00:00Z"),
    access: defaultWorkspaceAccess,
    workspace: {
      id: "workspace-1",
      ownerUserId: "user-1",
      providerKey: "test-provider",
      displayName: "Support",
      baseUrl: "https://helpdesk.example.com",
      createdAt: new Date("2026-05-24T00:00:00Z"),
      updatedAt: new Date("2026-05-24T00:00:00Z"),
    },
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
    findForUserWorkspace: async () => input.connection ?? null,
    findWorkspaceForUser: async () => {
      const value = input.connection;
      return value ? { ...value.workspace, access: value.access, connection: value } : null;
    },
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

export function provider(
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

export function mockValidatedBaseUrl() {
  mockedValidateProviderBaseUrl.mockResolvedValue({
    canonicalUrl: "https://helpdesk.example.com",
    addresses: ["93.184.216.34"],
  });
}

import { vi } from "vitest";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import { encryptSecret } from "@/security/encryption";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
} from "@/features/helpdesk-connections/repository";

export const key = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);

export function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(values)) {
    formData.set(name, value);
  }
  return formData;
}

export function connection(
  overrides: Partial<HelpdeskConnectionWithCredential> = {},
): HelpdeskConnectionWithCredential {
  return {
    id: "conn_1",
    userId: "user_1",
    providerKey: "example",
    displayName: "Support",
    baseUrl: "https://93.184.216.34",
    status: "active",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    credential: {
      scheme: "basic-auth",
      encryptedPayload: encryptSecret(
        JSON.stringify({ username: "agent", password: "secret" }),
        key,
      ),
      keyVersion: "v1",
    },
    ...overrides,
  };
}

export function repository(seed: HelpdeskConnectionWithCredential[] = []) {
  const rows = new Map(seed.map((row) => [row.id, row]));
  let activeConnectionId: string | null = null;
  let lastCreated: HelpdeskConnectionWithCredential | null = null;
  let lastUpdate: Record<string, unknown> | null = null;

  const repo: HelpdeskConnectionsRepository = {
    listForUser: async (userId) =>
      [...rows.values()].filter((row) => row.userId === userId),
    findForUser: async (userId, connectionId) => {
      const row = rows.get(connectionId);
      return row?.userId === userId ? row : null;
    },
    create: async (input) => {
      const created = connection({
        id: "created",
        userId: input.userId,
        providerKey: input.providerKey,
        displayName: input.displayName,
        baseUrl: input.baseUrl,
        status: input.status,
        credential: {
          scheme: input.credentialScheme,
          encryptedPayload: input.encryptedCredentialPayload,
          keyVersion: "v1",
        },
      });
      rows.set(created.id, created);
      lastCreated = created;
      return created;
    },
    update: async (input) => {
      const existing = rows.get(input.id);
      if (!existing || existing.userId !== input.userId) {
        return null;
      }
      lastUpdate = input as Record<string, unknown>;
      const updated = {
        ...existing,
        displayName: input.displayName,
        baseUrl: input.baseUrl,
        status: input.status ?? existing.status,
        credential:
          input.credentialScheme && input.encryptedCredentialPayload
            ? {
                scheme: input.credentialScheme,
                encryptedPayload: input.encryptedCredentialPayload,
                keyVersion: "v1",
              }
            : existing.credential,
      };
      rows.set(input.id, updated);
      return updated;
    },
    updateStatus: async (userId, connectionId, status) => {
      const existing = rows.get(connectionId);
      if (!existing || existing.userId !== userId) {
        return false;
      }
      rows.set(connectionId, { ...existing, status });
      return true;
    },
    deleteForUser: async (userId, connectionId) => {
      const existing = rows.get(connectionId);
      if (!existing || existing.userId !== userId) {
        return false;
      }
      rows.delete(connectionId);
      return true;
    },
    getActiveConnectionId: async () => activeConnectionId,
    setActiveConnectionId: async (_userId, connectionId) => {
      activeConnectionId = connectionId;
    },
    clearActiveConnectionId: async () => {
      activeConnectionId = null;
    },
  };

  return {
    repo,
    get activeConnectionId() {
      return activeConnectionId;
    },
    get lastCreated() {
      return lastCreated;
    },
    get lastUpdate() {
      return lastUpdate;
    },
  };
}

export function registry(validateConnection = vi.fn().mockResolvedValue(undefined)) {
  const plugin: HelpdeskProviderPlugin = {
    key: "example",
    label: "Example",
    capabilities: [],
    credentialSchemes: [
      {
        key: "basic-auth",
        label: "Basic Auth",
        fields: [
          { name: "username", label: "Username", type: "text", required: true },
          {
            name: "password",
            label: "Password",
            type: "password",
            required: true,
          },
        ],
      },
    ],
    validateConnection,
    listTickets: async () => ({
      tickets: [],
      loadedCount: 0,
      measuredAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
    getTicketDetail: async () => {
      throw new ProviderError("unsupported-capability", "Not implemented");
    },
    updateTicketMetadata: async () => {
      throw new ProviderError("unsupported-capability", "Not implemented");
    },
  };

  return { validateConnection, registry: createProviderRegistry([plugin]) };
}

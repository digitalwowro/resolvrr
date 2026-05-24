import { describe, expect, it, vi } from "vitest";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import { encryptSecret } from "@/security/encryption";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
} from "@/features/helpdesk-connections/repository";
import {
  setActiveConnection,
  setConnectionEnabled,
  updateConnection,
} from "@/features/helpdesk-connections/service";

const key = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(values).forEach(([name, value]) => formData.set(name, value));
  return formData;
}

function connection(
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

function repository(seed: HelpdeskConnectionWithCredential[]) {
  const rows = new Map(seed.map((row) => [row.id, row]));
  let activeConnectionId: string | null = null;
  let lastUpdate: Record<string, unknown> | null = null;

  const repo: HelpdeskConnectionsRepository = {
    listForUser: async (userId) =>
      [...rows.values()].filter((row) => row.userId === userId),
    findForUser: async (userId, connectionId) => {
      const row = rows.get(connectionId);
      return row?.userId === userId ? row : null;
    },
    create: async () => {
      throw new Error("Not needed in this test");
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
    deleteForUser: async () => false,
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
    get lastUpdate() {
      return lastUpdate;
    },
  };
}

function registry() {
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
    validateConnection: vi.fn().mockResolvedValue(undefined),
    listTickets: async () => ({
      tickets: [],
      measuredAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
    getTicketDetail: async () => {
      throw new ProviderError("unsupported-capability", "Not implemented");
    },
    updateTicketFields: async () => {
      throw new ProviderError("unsupported-capability", "Not implemented");
    },
  };

  return createProviderRegistry([plugin]);
}

describe("helpdesk connection security rules", () => {
  it("rejects provider key tampering on edit", async () => {
    const existing = connection();
    const store = repository([existing]);

    const result = await updateConnection(
      store.repo,
      registry(),
      key,
      "user_1",
      existing.id,
      form({
        displayName: "Support EU",
        providerKey: "other-provider",
        baseUrl: "https://93.184.216.34",
        credentialScheme: "basic-auth",
        username: "",
        password: "",
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "provider-mismatch" });
    expect(store.lastUpdate).toBeNull();
  });

  it("rejects non-active connections as the active selection", async () => {
    const existing = connection({ status: "auth_failed" });
    const store = repository([existing]);

    await expect(
      setActiveConnection(store.repo, "user_1", existing.id),
    ).resolves.toMatchObject({ ok: false, code: "connection-not-active" });
    expect(store.activeConnectionId).toBeNull();
  });

  it("does not mark unvalidated connections active when enabling", async () => {
    const existing = connection({ status: "disconnected" });
    const store = repository([existing]);

    await expect(
      setConnectionEnabled(store.repo, "user_1", existing.id, true),
    ).resolves.toMatchObject({ ok: true, code: "enabled" });

    const updated = await store.repo.findForUser("user_1", existing.id);
    expect(updated?.status).toBe("disconnected");
    expect(store.activeConnectionId).toBeNull();
  });
});

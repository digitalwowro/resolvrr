import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError, type HelpdeskProviderPlugin } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import { decryptSecret, encryptSecret } from "@/security/encryption";
import type {
  HelpdeskConnectionWithCredential,
  HelpdeskConnectionsRepository,
} from "@/features/helpdesk-connections/repository";
import {
  createConnection,
  deleteConnection,
  disableConnection,
  updateConnection,
  validateConnection,
} from "@/features/helpdesk-connections/service";

const key = Buffer.from("0123456789abcdef0123456789abcdef").toString("base64");

afterEach(() => {
  vi.restoreAllMocks();
});

function form(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(values)) {
    formData.set(name, value);
  }
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

function repository(seed: HelpdeskConnectionWithCredential[] = []) {
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

function registry(validateConnection = vi.fn().mockResolvedValue(undefined)) {
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
      measuredAt: new Date("2026-01-01T00:00:00.000Z"),
    }),
    getTicketDetail: async () => {
      throw new ProviderError("unsupported-capability", "Not implemented");
    },
    updateTicketFields: async () => {
      throw new ProviderError("unsupported-capability", "Not implemented");
    },
  };

  return { validateConnection, registry: createProviderRegistry([plugin]) };
}

describe("helpdesk connection service", () => {
  it("creates validated encrypted connections and makes the first connection active", async () => {
    const store = repository();
    const providers = registry();

    const result = await createConnection(
      store.repo,
      providers.registry,
      key,
      "user_1",
      form({
        displayName: "Support",
        providerKey: "example",
        baseUrl: "https://93.184.216.34/helpdesk/",
        credentialScheme: "basic-auth",
        username: "agent",
        password: "secret",
      }),
    );

    expect(result).toMatchObject({ ok: true, code: "created" });
    expect(providers.validateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://93.184.216.34/helpdesk",
        validatedAddresses: ["93.184.216.34"],
        credentialPayload: { username: "agent", password: "secret" },
      }),
    );
    expect(store.lastCreated?.baseUrl).toBe("https://93.184.216.34/helpdesk");
    expect(store.lastCreated?.id).toBe(store.activeConnectionId);
    expect(store.lastCreated?.baseUrl).not.toContain("secret");
    expect(
      decryptSecret(store.lastCreated?.credential?.encryptedPayload ?? "", key),
    ).toBe(JSON.stringify({ username: "agent", password: "secret" }));
  });

  it("trims connection metadata while preserving password bytes", async () => {
    const store = repository();
    const providers = registry();

    const result = await createConnection(
      store.repo,
      providers.registry,
      key,
      "user_1",
      form({
        displayName: "  Support  ",
        providerKey: "  example  ",
        baseUrl: "  https://93.184.216.34/helpdesk/  ",
        credentialScheme: "  basic-auth  ",
        username: "  agent  ",
        password: "  secret  ",
      }),
    );

    expect(result).toMatchObject({ ok: true, code: "created" });
    expect(providers.validateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "  secret  " },
      }),
    );
    expect(store.lastCreated?.displayName).toBe("Support");
    expect(store.lastCreated?.baseUrl).toBe("https://93.184.216.34/helpdesk");
    expect(
      decryptSecret(store.lastCreated?.credential?.encryptedPayload ?? "", key),
    ).toBe(JSON.stringify({ username: "agent", password: "  secret  " }));
  });

  it("preserves encrypted credentials when edit credential fields are blank", async () => {
    const existing = connection();
    const store = repository([existing]);

    const result = await updateConnection(
      store.repo,
      registry().registry,
      key,
      "user_1",
      existing.id,
      form({
        displayName: "Support EU",
        providerKey: "example",
        baseUrl: "https://93.184.216.34",
        credentialScheme: "basic-auth",
        username: "",
        password: "",
      }),
    );

    expect(result).toMatchObject({ ok: true, code: "updated" });
    expect(store.lastUpdate).not.toHaveProperty("encryptedCredentialPayload");
    expect((await store.repo.findForUser("user_1", existing.id))?.credential)
      .toEqual(existing.credential);
  });

  it("clears active selection when disabling or deleting the active connection", async () => {
    const existing = connection();
    const store = repository([existing]);
    await store.repo.setActiveConnectionId("user_1", existing.id);

    await expect(
      disableConnection(store.repo, "user_1", existing.id),
    ).resolves.toMatchObject({ ok: true, code: "disabled" });
    expect(store.activeConnectionId).toBeNull();

    await store.repo.setActiveConnectionId("user_1", existing.id);
    await expect(
      deleteConnection(store.repo, "user_1", existing.id),
    ).resolves.toMatchObject({ ok: true, code: "deleted" });
    expect(store.activeConnectionId).toBeNull();
  });

  it("revalidates base URL before provider validation and records auth failures", async () => {
    const existing = connection();
    const store = repository([existing]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const providers = registry(
      vi.fn().mockRejectedValue(
        new ProviderError("credential-auth-failure", "Rejected", false, 401),
      ),
    );

    const result = await validateConnection(
      store.repo,
      providers.registry,
      key,
      "user_1",
      existing.id,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "provider-auth-failed",
    });
    expect(providers.validateConnection).toHaveBeenCalledWith(
      expect.objectContaining({
        baseUrl: "https://93.184.216.34",
        validatedAddresses: ["93.184.216.34"],
      }),
    );
    expect((await store.repo.findForUser("user_1", existing.id))?.status).toBe(
      "auth_failed",
    );
    expect(warn).toHaveBeenCalledWith(
      "Helpdesk provider validation failed",
      expect.objectContaining({
        phase: "validate-existing-connection",
        providerKey: "example",
        canonicalHost: "93.184.216.34",
        providerErrorKind: "credential-auth-failure",
        retryable: false,
        statusCode: 401,
        statusClass: "4xx",
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret");
  });

  it("logs temporary provider diagnostics without logging secrets", async () => {
    const existing = connection();
    const store = repository([existing]);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const providers = registry(
      vi.fn().mockRejectedValue(
        new ProviderError(
          "temporary-provider-failure",
          "Network failure",
          true,
          undefined,
          "ENETUNREACH",
        ),
      ),
    );

    const result = await validateConnection(
      store.repo,
      providers.registry,
      key,
      "user_1",
      existing.id,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "provider-temporary-failure",
    });
    expect(warn).toHaveBeenCalledWith(
      "Helpdesk provider validation failed",
      expect.objectContaining({
        providerErrorKind: "temporary-provider-failure",
        diagnosticCode: "ENETUNREACH",
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret");
  });

  it.each([
    [
      new ProviderError("permission-denied", "Denied", false, 403),
      "provider-permission-denied",
    ],
    [
      new ProviderError("rate-limited", "Slow down", true, 429),
      "provider-rate-limited",
    ],
    [
      new ProviderError("temporary-provider-failure", "Unavailable", true, 503),
      "provider-temporary-failure",
    ],
    [
      new ProviderError("provider-data-mismatch", "Unexpected", false, 302),
      "provider-unexpected-response",
    ],
  ])("maps provider validation errors to safe message codes", async (error, code) => {
    const existing = connection();
    const store = repository([existing]);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const providers = registry(vi.fn().mockRejectedValue(error));

    const result = await validateConnection(
      store.repo,
      providers.registry,
      key,
      "user_1",
      existing.id,
    );

    expect(result).toMatchObject({ ok: false, code });
  });
});

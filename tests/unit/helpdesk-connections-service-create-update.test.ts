import { afterEach, describe, expect, it, vi } from "vitest";
import { decryptSecret } from "@/security/encryption";
import {
  createConnection,
  updateConnection,
} from "@/features/helpdesk-connections/service";
import {
  connection,
  form,
  key,
  registry,
  repository,
} from "./helpdesk-connections-service-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("helpdesk connection service create/update", () => {
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
    expect(store.lastCreated?.workspaceId).toBe(store.activeConnectionId);
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
      existing.workspaceId,
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

  it("requires disconnect before changing the linked provider identity", async () => {
    const existing = connection();
    const store = repository([existing]);
    const providers = registry(vi.fn().mockResolvedValue({
      externalId: "agent-2",
      displayName: "Agent Two",
    }));

    const result = await updateConnection(
      store.repo,
      providers.registry,
      key,
      existing.userId,
      existing.workspaceId,
      form({
        displayName: existing.displayName,
        providerKey: existing.providerKey,
        baseUrl: existing.baseUrl,
        credentialScheme: "basic-auth",
        username: "other-agent",
        password: "secret",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "identity-change-requires-reconnect",
    });
    expect(store.lastUpdate).toBeNull();
  });

  it("requires destructive confirmation before changing the shared provider URL", async () => {
    const existing = connection();
    const store = repository([existing]);

    const result = await updateConnection(
      store.repo,
      registry().registry,
      key,
      existing.userId,
      existing.workspaceId,
      form({
        displayName: existing.displayName,
        providerKey: existing.providerKey,
        baseUrl: "https://93.184.216.35",
        credentialScheme: "basic-auth",
        username: "",
        password: "",
      }),
    );

    expect(result).toMatchObject({
      ok: false,
      code: "base-url-change-confirmation-required",
    });
    expect(store.lastUpdate).toBeNull();
  });

  it("does not treat equivalent canonical URLs as destructive changes", async () => {
    const existing = connection();
    const store = repository([existing]);

    const result = await updateConnection(
      store.repo,
      registry().registry,
      key,
      existing.userId,
      existing.workspaceId,
      form({
        displayName: "Support renamed",
        providerKey: existing.providerKey,
        baseUrl: `${existing.baseUrl}/`,
        credentialScheme: "basic-auth",
        username: "",
        password: "",
      }),
    );

    expect(result).toMatchObject({ ok: true, code: "updated" });
    expect(store.lastUpdate).toMatchObject({
      displayName: "Support renamed",
      baseUrl: existing.baseUrl,
    });
  });

  it("allows the confirming admin to reconnect with the identity from a replacement URL", async () => {
    const existing = connection();
    const store = repository([existing]);
    const providers = registry(vi.fn().mockResolvedValue({
      externalId: "replacement-agent",
      displayName: "Replacement Agent",
    }));

    const result = await updateConnection(
      store.repo,
      providers.registry,
      key,
      existing.userId,
      existing.workspaceId,
      form({
        displayName: existing.displayName,
        providerKey: existing.providerKey,
        baseUrl: "https://93.184.216.35",
        confirmBaseUrlChange: "yes",
        credentialScheme: "basic-auth",
        username: "replacement-agent",
        password: "secret",
      }),
    );

    expect(result).toMatchObject({ ok: true, code: "updated" });
    expect(store.lastUpdate).toMatchObject({
      providerIdentityExternalId: "replacement-agent",
    });
  });
});

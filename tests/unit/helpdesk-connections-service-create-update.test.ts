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
});

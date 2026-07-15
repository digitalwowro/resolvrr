import { describe, expect, it } from "vitest";
import {
  setActiveConnection,
  updateConnection,
  validateConnection,
} from "@/features/helpdesk-connections/service";
import {
  connection,
  form,
  key,
  registry,
  repository,
} from "./helpdesk-connections-service-helpers";

describe("helpdesk connection security rules", () => {
  it("does not expose or validate another user's personal connection", async () => {
    const existing = connection();
    const store = repository([existing]);
    const providers = registry();

    expect(await store.repo.findForUser("user_2", existing.id)).toBeNull();
    await expect(
      validateConnection(
        store.repo,
        providers.registry,
        key,
        "user_2",
        existing.workspaceId,
      ),
    ).resolves.toMatchObject({
      ok: false,
      code: "personal-connection-required",
    });
    expect(providers.validateConnection).not.toHaveBeenCalled();
  });

  it("rejects provider key tampering on workspace edit", async () => {
    const existing = connection();
    const store = repository([existing]);

    const result = await updateConnection(
      store.repo,
      registry().registry,
      key,
      existing.userId,
      existing.workspaceId,
      form({
        displayName: "Support EU",
        providerKey: "other-provider",
        baseUrl: existing.baseUrl,
        credentialScheme: "basic-auth",
        username: "",
        password: "",
      }),
    );

    expect(result).toMatchObject({ ok: false, code: "provider-mismatch" });
    expect(store.lastUpdate).toBeNull();
  });

  it("does not let a non-member select a workspace", async () => {
    const existing = connection();
    const store = repository([existing]);

    await expect(
      setActiveConnection(store.repo, "user_2", existing.workspaceId),
    ).resolves.toMatchObject({ ok: false, code: "connection-not-found" });
    expect(store.activeConnectionId).toBeNull();
  });
});

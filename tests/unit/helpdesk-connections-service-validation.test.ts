import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { validateConnection } from "@/features/helpdesk-connections/service";
import {
  connection,
  key,
  registry,
  repository,
} from "./helpdesk-connections-service-helpers";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("helpdesk connection service validation", () => {
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
      existing.workspaceId,
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
      existing.workspaceId,
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

  it("rejects a provider identity already linked to another workspace member", async () => {
    const existing = connection({ providerIdentityExternalId: null });
    const store = repository([existing], { personalUpdateResult: "identity-taken" });
    const providers = registry();

    const result = await validateConnection(
      store.repo,
      providers.registry,
      key,
      existing.userId,
      existing.workspaceId,
    );

    expect(result).toMatchObject({
      ok: false,
      code: "provider-identity-already-linked",
    });
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
      existing.workspaceId,
    );

    expect(result).toMatchObject({ ok: false, code });
  });
});

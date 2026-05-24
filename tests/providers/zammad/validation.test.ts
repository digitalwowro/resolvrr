import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { zammadProviderPlugin } from "@/providers/zammad";

describe("Zammad connection validation", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("validates Basic Auth against the current-user endpoint without following redirects", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetch);

    await zammadProviderPlugin.validateConnection({
      baseUrl: "https://helpdesk.example.com",
      credentialScheme: "basic-auth",
      credentialPayload: { username: "agent", password: "secret" },
      timeoutMs: 1000,
    });

    expect(fetch).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/users/me",
      expect.objectContaining({
        redirect: "manual",
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
        }),
      }),
    );
  });

  it("does not send credentials to redirect targets", async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));
    vi.stubGlobal("fetch", fetch);

    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent", password: "secret" },
      }),
    ).rejects.toMatchObject({ kind: "provider-data-mismatch" });

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0]?.[1]).toMatchObject({ redirect: "manual" });
  });

  it("classifies unreachable provider validation as retryable temporary failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("timeout")));

    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent", password: "secret" },
      }),
    ).rejects.toMatchObject({
      kind: "temporary-provider-failure",
      retryable: true,
    });
  });

  it("rejects incomplete credentials with a provider-neutral validation failure", async () => {
    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent" },
      }),
    ).rejects.toBeInstanceOf(ProviderError);
    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent" },
      }),
    ).rejects.toMatchObject({ kind: "validation-failure" });
  });
});

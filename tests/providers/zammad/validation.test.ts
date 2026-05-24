import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderFetch } from "@/security/provider-http";

vi.mock("@/security/provider-http", () => ({
  safeProviderFetch: vi.fn(),
}));

const mockedSafeProviderFetch = vi.mocked(safeProviderFetch);

describe("Zammad connection validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("validates Basic Auth through the SSRF-safe current-user endpoint request", async () => {
    mockedSafeProviderFetch.mockResolvedValue(new Response("{}", { status: 200 }));

    await zammadProviderPlugin.validateConnection({
      baseUrl: "https://helpdesk.example.com",
      validatedAddresses: ["93.184.216.34"],
      credentialScheme: "basic-auth",
      credentialPayload: { username: "agent", password: "secret" },
      timeoutMs: 1000,
    });

    expect(mockedSafeProviderFetch).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/users/me",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
        }),
      }),
    );
  });

  it("does not send credentials to redirect targets", async () => {
    mockedSafeProviderFetch.mockResolvedValue(new Response(null, { status: 302 }));

    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        validatedAddresses: ["93.184.216.34"],
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent", password: "secret" },
      }),
    ).rejects.toMatchObject({ kind: "provider-data-mismatch" });

    expect(mockedSafeProviderFetch).toHaveBeenCalledTimes(1);
  });

  it("classifies unreachable provider validation as retryable temporary failure", async () => {
    mockedSafeProviderFetch.mockRejectedValue(new Error("timeout"));

    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        validatedAddresses: ["93.184.216.34"],
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
        validatedAddresses: ["93.184.216.34"],
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent" },
      }),
    ).rejects.toBeInstanceOf(ProviderError);
    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        validatedAddresses: ["93.184.216.34"],
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent" },
      }),
    ).rejects.toMatchObject({ kind: "validation-failure" });
  });
});

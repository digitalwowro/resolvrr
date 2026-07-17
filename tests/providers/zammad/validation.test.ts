import { afterEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
}));

const mockedSafeProviderJson = vi.mocked(safeProviderJson);
const currentUser = { id: 42, fullname: "Agent One" };

describe("Zammad connection validation", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("validates Basic Auth through the SSRF-safe current-user endpoint request", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: currentUser })
      .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: [] });

    const identity = await zammadProviderPlugin.validateConnection({
      baseUrl: "https://helpdesk.example.com",
      validatedAddresses: ["93.184.216.34"],
      credentialScheme: "basic-auth",
      credentialPayload: { username: "agent", password: "secret" },
      timeoutMs: 1000,
    });

    expect(identity).toEqual({ externalId: "42", displayName: "Agent One" });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/users/me",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        maxResponseBytes: 256 * 1024,
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
          "User-Agent": "Resolvrr/1.0",
        }),
        signal: expect.any(AbortSignal),
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/taskbar",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        maxResponseBytes: 512 * 1024,
      }),
    );
  });

  it("does not duplicate the API path when users enter a Zammad API URL", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200, headers: new Headers(), data: currentUser,
    });

    await zammadProviderPlugin.validateConnection({
      baseUrl: "https://helpdesk.example.com/api/v1",
      validatedAddresses: ["93.184.216.34"],
      credentialScheme: "basic-auth",
      credentialPayload: { username: "agent", password: "secret" },
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/users/me",
      expect.any(Object),
    );
  });

  it("does not send credentials to redirect targets", async () => {
    mockedSafeProviderJson.mockResolvedValue({ status: 302, headers: new Headers() });

    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        validatedAddresses: ["93.184.216.34"],
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent", password: "secret" },
      }),
    ).rejects.toMatchObject({
      kind: "provider-data-mismatch",
      statusCode: 302,
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(1);
  });

  it.each([
    [401, "credential-auth-failure", false],
    [403, "permission-denied", false],
    [429, "rate-limited", true],
    [503, "temporary-provider-failure", true],
  ])(
    "classifies Zammad validation status %i",
    async (status, kind, retryable) => {
      mockedSafeProviderJson.mockResolvedValue({ status, headers: new Headers() });

      await expect(
        zammadProviderPlugin.validateConnection({
          baseUrl: "https://helpdesk.example.com",
          validatedAddresses: ["93.184.216.34"],
          credentialScheme: "basic-auth",
          credentialPayload: { username: "agent", password: "secret" },
        }),
      ).rejects.toMatchObject({ kind, retryable, statusCode: status });
    },
  );

  it("classifies unreachable provider validation as retryable temporary failure", async () => {
    const error = new Error("network unreachable");
    Object.defineProperty(error, "code", { value: "ENETUNREACH" });
    mockedSafeProviderJson.mockRejectedValue(error);

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
      diagnosticCode: "ENETUNREACH",
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

  it("rejects current-user responses without a usable provider identity", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: { fullname: "Agent without id" },
    });

    await expect(
      zammadProviderPlugin.validateConnection({
        baseUrl: "https://helpdesk.example.com",
        validatedAddresses: ["93.184.216.34"],
        credentialScheme: "basic-auth",
        credentialPayload: { username: "agent", password: "secret" },
      }),
    ).rejects.toMatchObject({ kind: "provider-data-mismatch" });
  });
});

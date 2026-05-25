import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;

    constructor(reason: string, message: string) {
      super(message);
      this.name = "ProviderJsonBodyError";
      this.reason = reason;
    }
  },
}));

const mockedSafeProviderJson = vi.mocked(safeProviderJson);

describe("Zammad ticket metadata mutations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps canonical state and priority keys to Zammad values inside the provider", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: { id: 42 },
    });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      state: "pending_reminder",
      priority: "medium",
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/42",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        body: JSON.stringify({
          state: "pending reminder",
          priority: "2 normal",
        }),
        headers: expect.objectContaining({
          Accept: "application/json",
          Authorization: "Basic YWdlbnQ6c2VjcmV0",
          "Content-Type": "application/json",
          "User-Agent": "Resolvrr/1.0",
        }),
        maxResponseBytes: 512 * 1024,
        method: "PUT",
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it("rejects empty metadata mutations before provider I/O", async () => {
    await expect(
      zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {}),
    ).rejects.toMatchObject({
      kind: "validation-failure",
    });

    expect(mockedSafeProviderJson).not.toHaveBeenCalled();
  });
});

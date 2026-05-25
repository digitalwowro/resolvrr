import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext, rawTicket } from "./read-helpers";

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
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: rawTicket,
    });
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: { id: 42 },
    });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      state: "closed",
      priority: "medium",
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true&full=true",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        maxResponseBytes: 2 * 1024 * 1024,
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/tickets/42",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
        body: JSON.stringify({
          state: "closed",
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

  it("maps pending state transitions with a pending time", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: rawTicket,
    });
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: { id: 42 },
    });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      state: "pending_reminder",
      pendingUntil: new Date("2099-01-02T03:04:00.000Z"),
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/tickets/42",
      expect.objectContaining({
        body: JSON.stringify({
          state: "pending reminder",
          pending_time: "2099-01-02T03:04:00.000Z",
        }),
      }),
    );
  });

  it("rejects pending state transitions without a future pending time", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: rawTicket,
    });

    await expect(
      zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
        state: "pending_reminder",
      }),
    ).rejects.toMatchObject({
      kind: "validation-failure",
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledOnce();
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true&full=true",
      expect.any(Object),
    );
  });

  it("rejects returning non-new Zammad tickets to new before the write", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: rawTicket,
    });

    await expect(
      zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
        state: "new",
      }),
    ).rejects.toMatchObject({
      kind: "validation-failure",
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledOnce();
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

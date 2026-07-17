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

  it("maps owner and group external IDs to Zammad assignment fields", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: rawTicket,
    });
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: [
        {
          id: 3,
          firstname: "Agent",
          lastname: "Smith",
          active: true,
          group_ids: { "7": ["full"] },
        },
      ],
    });
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: { id: 42 },
    });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      ownerExternalId: "3",
      groupExternalId: "7",
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(3);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/42",
      expect.objectContaining({
        body: JSON.stringify({
          owner_id: 3,
          group_id: 7,
        }),
        method: "PUT",
      }),
    );
  });

  it("rejects an owner without full group access before the ticket write", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [],
      });

    await expect(
      zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
        ownerExternalId: "3",
        groupExternalId: "7",
      }),
    ).rejects.toMatchObject({
      diagnosticCode: "owner-group-mismatch",
      kind: "validation-failure",
    });
    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(2);
    expect(mockedSafeProviderJson.mock.calls).not.toContainEqual([
      expect.any(String),
      expect.objectContaining({ method: "PUT" }),
    ]);
  });

  it("rejects non-numeric Zammad assignment IDs before provider I/O", async () => {
    await expect(
      zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
        ownerExternalId: "agent-2",
      }),
    ).rejects.toMatchObject({
      kind: "validation-failure",
    });

    expect(mockedSafeProviderJson).not.toHaveBeenCalled();
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

  it("rejects orphan pending times before the write", async () => {
    await expect(
      zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
        priority: "high",
        pendingUntil: new Date("2099-01-02T03:04:00.000Z"),
      }),
    ).rejects.toMatchObject({
      kind: "validation-failure",
    });

    expect(mockedSafeProviderJson).not.toHaveBeenCalled();
  });

  it("rejects every metadata write for a merged ticket", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: { ...rawTicket, state: "merged" },
    });

    await expect(
      zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
        linkAddExternalId: "77",
        linkRemoveExternalIds: ["88"],
        priority: "high",
        subscriptionFollowing: true,
        tags: ["vip"],
      }),
    ).rejects.toMatchObject({
      kind: "validation-failure",
      diagnosticCode: "ticket-merged",
    });
    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(1);
    expect(mockedSafeProviderJson.mock.calls[0]?.[1]).not.toMatchObject({
      method: expect.stringMatching(/POST|PUT|PATCH|DELETE/u),
    });
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

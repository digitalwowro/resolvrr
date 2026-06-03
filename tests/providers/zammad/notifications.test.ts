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

describe("Zammad notifications", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps online notifications to provider-neutral ticket notifications", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            id: 7,
            object: "Ticket",
            o_id: 42,
            seen: false,
            type: "reminder_reached",
            created_at: "2026-06-03T08:00:00.000Z",
            created_by: "agent@example.com",
          },
          {
            id: 8,
            object: "User",
            o_id: 3,
            seen: false,
            type: "update",
            created_at: "2026-06-03T08:01:00.000Z",
          },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      });

    const result = await zammadProviderPlugin.listNotifications?.(
      providerContext(),
    );

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/online_notifications?expand=true",
      expect.objectContaining({
        allowedAddresses: ["93.184.216.34"],
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/tickets/42",
      expect.any(Object),
    );
    expect(result).toEqual([
      {
        id: "7",
        read: false,
        type: "ticket-reminder",
        ticketExternalId: "42",
        ticketNumber: "42042",
        ticketTitle: "Cannot log in",
        createdAt: new Date("2026-06-03T08:00:00.000Z"),
        actor: "agent@example.com",
      },
    ]);
  });

  it("marks individual notifications and all notifications read", async () => {
    mockedSafeProviderJson.mockResolvedValue({
      status: 200,
      headers: new Headers(),
      data: {},
    });

    await zammadProviderPlugin.markNotificationsRead?.(providerContext(), {
      notificationIds: ["7", "7", "8"],
    });
    await zammadProviderPlugin.markNotificationsRead?.(providerContext(), {
      all: true,
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/online_notifications/7",
      expect.objectContaining({
        body: JSON.stringify({ seen: true }),
        method: "PUT",
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/online_notifications/8",
      expect.objectContaining({
        body: JSON.stringify({ seen: true }),
        method: "PUT",
      }),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/online_notifications/mark_all_as_read",
      expect.objectContaining({
        body: JSON.stringify({}),
        method: "POST",
      }),
    );
  });
});

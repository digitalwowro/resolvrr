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

describe("Zammad ticket subscription mutations", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("deletes only the current user's ticket mention when unfollowing", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: { id: 4, email: "agent@example.com" },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          mentions: [
            {
              id: 9,
              mentionable_type: "Ticket",
              mentionable_id: 42,
              user_id: 3,
            },
            {
              id: 10,
              mentionable_type: "Ticket",
              mentionable_id: 42,
              user_id: 4,
            },
          ],
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {},
      });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      subscriptionFollowing: false,
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/users/me",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/mentions?mentionable_type=Ticket&mentionable_id=42",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      4,
      "https://helpdesk.example.com/api/v1/mentions/10",
      expect.objectContaining({ method: "DELETE" }),
    );
    expect(mockedSafeProviderJson).not.toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/mentions/9",
      expect.any(Object),
    );
  });

  it("does not delete another user's ticket mention when the current user is not following", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: { id: 4, email: "agent@example.com" },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          mentions: [
            {
              id: 9,
              mentionable_type: "Ticket",
              mentionable_id: 42,
              user_id: 3,
            },
          ],
        },
      });

    await zammadProviderPlugin.updateTicketMetadata?.(providerContext(), "42", {
      subscriptionFollowing: false,
    });

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(3);
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/users/me",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/mentions?mentionable_type=Ticket&mentionable_id=42",
      expect.any(Object),
    );
  });
});

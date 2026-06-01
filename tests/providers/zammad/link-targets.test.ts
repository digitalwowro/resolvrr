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

describe("Zammad link target search", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps ticket search results into provider-neutral link targets", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        record_ids: [77],
        assets: {
          Ticket: {
            "77": {
              id: 77,
              number: "16004",
              title: "Open",
              customer_id: 5,
              owner_id: 1,
              group_id: 2,
              state_id: 4,
              priority_id: 2,
              created_at: "2026-05-24T08:00:00.000Z",
              updated_at: "2026-05-24T09:00:00.000Z",
            },
          },
          User: {
            "5": {
              id: 5,
              firstname: "Test",
              lastname: "Customer",
              email: "test@example.com",
            },
          },
          State: { "4": { id: 4, name: "open" } },
          TicketPriority: { "2": { id: 2, name: "2 normal" } },
        },
      },
    });

    await expect(
      zammadProviderPlugin.searchLinkTargets?.(providerContext(), {
        excludeTicketExternalId: "42",
        query: "16004",
      }),
    ).resolves.toEqual([
      {
        customer: "Test Customer",
        externalId: "77",
        number: "16004",
        priority: "medium",
        state: "open",
        title: "Open",
      },
    ]);
    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/search?full=true&limit=8&query=16004",
      expect.any(Object),
    );
  });

  it("does not call Zammad for empty link target search queries", async () => {
    await expect(
      zammadProviderPlugin.searchLinkTargets?.(providerContext(), {
        query: " ",
      }),
    ).resolves.toEqual([]);
    expect(mockedSafeProviderJson).not.toHaveBeenCalled();
  });

  it("maps provider-neutral customer filters to Zammad search syntax", async () => {
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 200,
      headers: new Headers(),
      data: {
        record_ids: [],
        assets: {},
      },
    });

    await expect(
      zammadProviderPlugin.searchLinkTargets?.(providerContext(), {
        customerExternalId: "5",
        excludeTicketExternalId: "42",
      }),
    ).resolves.toEqual([]);

    expect(mockedSafeProviderJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/tickets/search?full=true&limit=8&query=customer_id%3A5",
      expect.any(Object),
    );
  });
});

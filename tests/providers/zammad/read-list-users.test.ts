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

describe("Zammad ticket list user assets", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves user display names when Zammad omits full user assets", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            ...rawTicket,
            customer: "nicole.braun@zammad.org",
            customer_id: 7,
            owner: "games.bond@zammad.isp.fun",
            owner_id: 11,
          },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 7,
          firstname: "Nicole",
          lastname: "Braun",
          email: "nicole.braun@zammad.org",
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 11,
          firstname: "Games",
          lastname: "Bond",
          email: "games.bond@zammad.isp.fun",
        },
      });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 10,
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/users/7",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/users/11",
      expect.any(Object),
    );
    expect(result?.tickets[0]?.customer).toEqual({
      externalId: "7",
      name: "Nicole Braun",
      email: "nicole.braun@zammad.org",
      role: "customer",
    });
    expect(result?.tickets[0]?.owner).toEqual({
      externalId: "11",
      name: "Games Bond",
      email: "games.bond@zammad.isp.fun",
      role: "agent",
    });
  });

  it("fetches the customer organization when Zammad only returns an organization id", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            ...rawTicket,
            customer: "nicole.braun@zammad.org",
            customer_id: 7,
          },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 7,
          firstname: "Nicole",
          lastname: "Braun",
          email: "nicole.braun@zammad.org",
          organization_id: 3,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: { id: 3, name: "Acme Corp" },
      });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 10,
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/organizations/3",
      expect.any(Object),
    );
    expect(result?.tickets[0]?.customer).toMatchObject({
      externalId: "7",
      name: "Nicole Braun",
      email: "nicole.braun@zammad.org",
      organization: "Acme Corp",
      role: "customer",
    });
  });
});

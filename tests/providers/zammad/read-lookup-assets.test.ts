import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { normalTicketDetail, providerContext, rawArticle, rawTicket } from "./read-helpers";

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

describe("Zammad ticket read lookup assets", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("resolves list group, state, and priority names when Zammad only returns ids", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            ...rawTicket,
            group: undefined,
            group_id: 4,
            state: undefined,
            state_id: 2,
            priority: undefined,
            priority_id: 3,
          },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          { id: 4, name: "Channel Team" },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          { id: 1, name: "new" },
          { id: 2, name: "open" },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          { id: 1, name: "1 low" },
          { id: 2, name: "2 normal" },
          { id: 3, name: "3 high" },
        ],
      });

    const result = await zammadProviderPlugin.listTickets?.(providerContext(), {
      filter: {},
      pageSize: 10,
    });

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/groups",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/ticket_states",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      4,
      "https://helpdesk.example.com/api/v1/ticket_priorities",
      expect.any(Object),
    );
    expect(result?.tickets[0]).toMatchObject({
      group: {
        externalId: "4",
        name: "Channel Team",
      },
      state: "open",
      priority: "high",
    });
  });

  it("resolves selected-ticket detail names when Zammad omits full user assets", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          ...rawTicket,
          customer: "nicole.braun@zammad.org",
          customer_id: 7,
          owner: "games.bond@zammad.isp.fun",
          owner_id: 11,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            ...rawArticle,
            created_by: "nicole.braun@zammad.org",
            created_by_id: 7,
            from: "nicole.braun@zammad.org",
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

    const result = normalTicketDetail(
      await zammadProviderPlugin.getTicketDetail?.(providerContext(), "42"),
    );

    expect(result?.ticket.customer?.name).toBe("Nicole Braun");
    expect(result?.ticket.owner?.name).toBe("Games Bond");
    expect(result?.thread.articles[0]?.author.name).toBe("Nicole Braun");
  });

  it("resolves article recipient emails against loaded user assets", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          ...rawTicket,
          customer: "nicole.braun@zammad.org",
          customer_id: 7,
          owner: "games.bond@zammad.isp.fun",
          owner_id: 11,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            ...rawArticle,
            sender: "Agent",
            created_by: "games.bond@zammad.isp.fun",
            created_by_id: 11,
            from: "games.bond@zammad.isp.fun",
            to: "nicole.braun@zammad.org",
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

    const result = normalTicketDetail(
      await zammadProviderPlugin.getTicketDetail?.(providerContext(), "42"),
    );

    expect(result?.thread.articles[0]?.author.name).toBe("Games Bond");
    expect(result?.thread.articles[0]?.recipients).toEqual([
      {
        channel: "to",
        externalId: "7",
        name: "Nicole Braun",
        email: "nicole.braun@zammad.org",
        role: "unknown",
      },
    ]);
  });

  it("uses the outbound email From identity instead of the Zammad login user", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          ...rawTicket,
          customer: "razvan.rosca@gmail.com",
          customer_id: 7,
          owner: "admin@zammad.isp.fun",
          owner_id: 11,
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            ...rawArticle,
            sender: "Agent",
            created_by: "admin@zammad.isp.fun",
            created_by_id: 11,
            from: "Za Mad via Users <users@zammad.isp.fun>",
            to: "razvan.rosca@gmail.com",
            body: "<p>Thanks, we're working on it!</p>",
          },
        ],
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 7,
          firstname: "Razvan",
          lastname: "Rosca",
          email: "razvan.rosca@gmail.com",
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          id: 11,
          fullname: "Admin User",
          email: "admin@zammad.isp.fun",
        },
      });

    const result = normalTicketDetail(
      await zammadProviderPlugin.getTicketDetail?.(providerContext(), "245"),
    );

    expect(result?.thread.articles[0]?.author).toEqual({
      name: "Za Mad via Users",
      email: "users@zammad.isp.fun",
      role: "agent",
    });
    expect(result?.thread.articles[0]?.author.email).not.toBe(
      "admin@zammad.isp.fun",
    );
  });
});

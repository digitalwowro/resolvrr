import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext, rawArticle, rawTicket } from "./read-helpers";

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

describe("Zammad ticket read assets", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("accepts real Zammad attachment metadata shapes", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [
          {
            ...rawArticle,
            attachments: [
              {
                id: 501,
                filename: "message.html",
                size: "3492",
                preferences: {
                  "Mime-Type": "text/html",
                  Charset: "utf-8",
                  "content-alternative": true,
                  "original-format": false,
                },
              },
            ],
          },
        ],
      });

    const result = await zammadProviderPlugin.getTicketDetail?.(
      providerContext(),
      "42",
    );

    expect(result?.thread.articles[0]?.attachments).toEqual([
      {
        externalId: "501",
        fileName: "message.html",
        contentType: "text/html",
        byteSize: 3492,
      },
    ]);
  });

  it("prefers expanded Zammad user display names over email labels", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          record_ids: [42],
          assets: {
            Ticket: {
              42: {
                ...rawTicket,
                customer: "nicole.braun@zammad.org",
                customer_id: 7,
                owner: "agent@example.com",
                owner_id: 8,
                state_id: 1,
                priority_id: 3,
              },
            },
            User: {
              7: {
                id: 7,
                firstname: "Nicole",
                lastname: "Braun",
                email: "nicole.braun@zammad.org",
              },
              8: {
                id: 8,
                fullname: "Agent Smith",
                email: "agent@example.com",
              },
            },
            State: { 1: { id: 1, name: "open" } },
            TicketPriority: { 3: { id: 3, name: "3 high" } },
          },
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          record_ids: [500],
          assets: {
            TicketArticle: {
              500: {
                ...rawArticle,
                created_by: "nicole.braun@zammad.org",
                created_by_id: 7,
                from: "nicole.braun@zammad.org",
                to: "Support Team <support@example.com>",
              },
            },
            User: {
              7: {
                id: 7,
                firstname: "Nicole",
                lastname: "Braun",
                email: "nicole.braun@zammad.org",
              },
            },
          },
        },
      });

    const result = await zammadProviderPlugin.getTicketDetail?.(
      providerContext(),
      "42",
    );

    expect(result?.ticket.customer).toEqual({
      externalId: "7",
      name: "Nicole Braun",
      email: "nicole.braun@zammad.org",
      role: "customer",
    });
    expect(result?.ticket.owner).toEqual({
      externalId: "8",
      name: "Agent Smith",
      email: "agent@example.com",
      role: "agent",
    });
    expect(result?.thread.articles[0]?.author).toEqual({
      externalId: "7",
      name: "Nicole Braun",
      email: "nicole.braun@zammad.org",
      role: "customer",
    });
    expect(result?.thread.articles[0]?.recipients).toEqual([
      {
        channel: "to",
        name: "Support Team",
        email: "support@example.com",
      },
    ]);
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
      sort: { key: "updatedAt", direction: "descending" },
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

    const result = await zammadProviderPlugin.getTicketDetail?.(
      providerContext(),
      "42",
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

    const result = await zammadProviderPlugin.getTicketDetail?.(
      providerContext(),
      "42",
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
});

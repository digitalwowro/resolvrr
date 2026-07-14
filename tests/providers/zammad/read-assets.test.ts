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

describe("Zammad ticket read assets", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters Zammad message body alternatives from visible attachments", async () => {
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
                  "original-format": true,
                },
              },
              {
                id: 502,
                filename: "report.html",
                size: "8192",
                preferences: {
                  "Mime-Type": "text/html",
                  Charset: "utf-8",
                },
              },
            ],
          },
        ],
      });

    const result = normalTicketDetail(
      await zammadProviderPlugin.getTicketDetail?.(providerContext(), "42"),
    );

    expect(result?.thread.articles[0]?.attachments).toEqual([
      {
        externalId: "502",
        fileName: "report.html",
        contentType: "text/html",
        byteSize: 8192,
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

    const result = normalTicketDetail(
      await zammadProviderPlugin.getTicketDetail?.(providerContext(), "42"),
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

  it("maps the customer organization from Zammad full-payload assets", async () => {
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
                organization_id: 3,
              },
            },
            User: {
              7: {
                id: 7,
                firstname: "Nicole",
                lastname: "Braun",
                email: "nicole.braun@zammad.org",
                organization_id: 3,
              },
            },
            Organization: {
              3: { id: 3, name: "Acme Corp" },
            },
          },
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [],
      });

    const result = normalTicketDetail(
      await zammadProviderPlugin.getTicketDetail?.(providerContext(), "42"),
    );

    expect(result?.ticket.customer).toMatchObject({
      externalId: "7",
      name: "Nicole Braun",
      email: "nicole.braun@zammad.org",
      organization: "Acme Corp",
      role: "customer",
    });
    expect(result?.ticket.group?.name).toBe("Users");
  });
});

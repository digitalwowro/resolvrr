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

describe("Zammad ticket detail reads", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("maps Zammad detail and thread without optional feature leakage", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: rawTicket,
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [rawArticle],
      });

    const result = await zammadProviderPlugin.getTicketDetail?.(
      providerContext(),
      "42",
    );

    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      1,
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true&full=true",
      expect.any(Object),
    );
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/ticket_articles/by_ticket/42?expand=true&full=true",
      expect.any(Object),
    );
    expect(result).toMatchObject({
      ticket: { externalId: "42", state: "open", priority: "high" },
      thread: {
        ticketExternalId: "42",
        articles: [
          {
            externalId: "500",
            kind: "message",
            visibility: "public",
            direction: "inbound",
            author: { name: "Maya Patel", role: "customer" },
          },
        ],
      },
      links: [],
      subscription: { supported: false, following: false },
    });
    expect(result?.thread.articles[0]?.sanitizedHtml).not.toContain("<script>");
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "detail",
        phase: "provider-detail-metadata-request",
        providerKey: "zammad",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "detail",
        phase: "provider-article-thread-request",
        providerKey: "zammad",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "detail",
        phase: "provider-mapping-parsing",
        providerKey: "zammad",
        status: "ok",
      }),
    );
  });
});

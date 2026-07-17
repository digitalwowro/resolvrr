import { afterEach, describe, expect, it, vi } from "vitest";
import type { TicketArticle } from "@/core/tickets";
import { zammadProviderPlugin } from "@/providers/zammad";
import { zammadReplyContext } from "@/providers/zammad/reply-context";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.reason = reason;
    }
  },
}));

const mockedSafeProviderJson = vi.mocked(safeProviderJson);
const customer = { externalId: "10", name: "Maya Patel", email: "maya@example.com", role: "customer" as const };
const mappedArticle: TicketArticle = {
  attachments: [],
  author: customer,
  createdAt: new Date("2026-05-24T08:31:00Z"),
  direction: "inbound",
  externalId: "500",
  kind: "message",
  recipients: [],
  sanitizedHtml: "<p>Hello</p>",
  visibility: "public",
};
const ticket = {
  id: 42,
  number: "42042",
  title: "Cannot log in",
  customer_id: 10,
  updated_at: "2026-05-24T08:30:00Z",
};
const user = { id: 10, firstname: "Maya", lastname: "Patel", email: "maya@example.com" };

function article(overrides: Record<string, unknown> = {}) {
  return {
    id: 500,
    ticket_id: 42,
    type: "email",
    sender: "Customer",
    internal: false,
    from: "Maya Patel <maya@example.com>",
    to: "Support <support@example.com>",
    cc: null,
    subject: "Cannot log in",
    message_id: "source-message@example.com",
    body: "Hello",
    created_at: "2026-05-24T08:31:00Z",
    attachments: [],
    ...overrides,
  };
}

function contextFor(source = article()) {
  const context = zammadReplyContext({
    article: source,
    customer,
    managedAddresses: ["support@example.com"],
    mappedArticle,
  });
  if (!context) throw new Error("Expected reply context");
  return context;
}

function arrangeReads(source = article()) {
  mockedSafeProviderJson
    .mockResolvedValueOnce({
      status: 200, headers: new Headers(),
      data: { assets: { Ticket: { "42": ticket }, User: { "10": user } }, record_ids: [42] },
    })
    .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: source })
    .mockResolvedValueOnce({
      status: 200, headers: new Headers(),
      data: [{ id: 1, email: "support@example.com", active: true }],
    });
}

describe("Zammad contextual customer reply mutations", () => {
  afterEach(() => vi.clearAllMocks());

  it("revalidates context and sends the source subject and In-Reply-To", async () => {
    const source = article();
    arrangeReads(source);
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 201, headers: new Headers(),
      data: { ...source, id: 501, sender: "Agent", from: "support@example.com", to: "maya@example.com" },
    });
    const replyContext = contextFor(source);

    await zammadProviderPlugin.addTicketCustomerReply?.(
      providerContext(),
      "42",
      {
        body: "  Thanks for the report.  ",
        cc: [],
        contextVersion: replyContext.contextVersion,
        intent: "reply",
        sourceArticleExternalId: "500",
        to: ["Maya@Example.com"],
      },
    );

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(4);
    expect(mockedSafeProviderJson).toHaveBeenNthCalledWith(
      4,
      "https://helpdesk.example.com/api/v1/ticket_articles",
      expect.objectContaining({
        body: JSON.stringify({
          ticket_id: 42,
          to: "maya@example.com",
          cc: "",
          subject: "Cannot log in",
          body: "Thanks for the report.",
          content_type: "text/plain",
          type: "email",
          internal: false,
          sender: "Agent",
          in_reply_to: "source-message@example.com",
        }),
        method: "POST",
      }),
    );
  });

  it("preserves a structured mention in an HTML customer reply", async () => {
    const source = article();
    arrangeReads(source);
    mockedSafeProviderJson.mockResolvedValueOnce({
      status: 201, headers: new Headers(),
      data: { ...source, id: 501, sender: "Agent" },
    });
    const replyContext = contextFor(source);

    await zammadProviderPlugin.addTicketCustomerReply?.(
      providerContext(),
      "42",
      {
        body:
          '<p><span data-resolvrr-mention-id="4" contenteditable="false">Manuela Duma</span> FYI.</p>',
        bodyFormat: "html",
        cc: [],
        contextVersion: replyContext.contextVersion,
        intent: "reply",
        sourceArticleExternalId: "500",
        to: ["maya@example.com"],
      },
    );

    const request = JSON.parse(
      String(mockedSafeProviderJson.mock.calls[3]?.[1]?.body),
    );
    expect(request.body).toBe(
      '<p><a href="https://helpdesk.example.com/#user/profile/4" data-mention-user-id="4">Manuela Duma</a> FYI.</p>',
    );
  });

  it("does not POST when the reply context version is stale", async () => {
    arrangeReads(article());

    await expect(zammadProviderPlugin.addTicketCustomerReply?.(
      providerContext(),
      "42",
      {
        body: "Thanks",
        cc: [],
        contextVersion: "stale",
        intent: "reply",
        sourceArticleExternalId: "500",
        to: ["maya@example.com"],
      },
    )).rejects.toMatchObject({ diagnosticCode: "reply-context-stale" });

    expect(mockedSafeProviderJson).toHaveBeenCalledTimes(3);
    expect(mockedSafeProviderJson.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });

  it("does not POST a reply when the ticket is merged", async () => {
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: {
          assets: {
            Ticket: { "42": { ...ticket, state: "merged" } },
            User: { "10": user },
          },
          record_ids: [42],
        },
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: article(),
      })
      .mockResolvedValueOnce({
        status: 200,
        headers: new Headers(),
        data: [{ id: 1, email: "support@example.com", active: true }],
      });

    await expect(
      zammadProviderPlugin.addTicketCustomerReply?.(
        providerContext(),
        "42",
        {
          body: "Do not send",
          cc: [],
          contextVersion: "unused",
          intent: "reply-all",
          sourceArticleExternalId: "500",
          to: ["maya@example.com"],
        },
      ),
    ).rejects.toMatchObject({ diagnosticCode: "ticket-merged" });

    expect(
      mockedSafeProviderJson.mock.calls.some((call) => call[1]?.method === "POST"),
    ).toBe(false);
  });
});

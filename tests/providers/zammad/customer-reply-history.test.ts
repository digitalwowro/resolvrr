import { afterEach, describe, expect, it, vi } from "vitest";
import type { TicketArticle } from "@/core/tickets";
import { zammadProviderPlugin } from "@/providers/zammad";
import { zammadReplyContext } from "@/providers/zammad/reply-context";
import {
  zammadReplyConversationHistoryContext,
} from "@/providers/zammad/reply-conversation-history";
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
const customer = {
  email: "maya@example.com",
  externalId: "10",
  name: "Maya Patel",
  role: "customer" as const,
};
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
  customer_id: 10,
  id: 42,
  number: "42042",
  title: "Cannot log in",
  updated_at: "2026-05-24T08:30:00Z",
};

function article(overrides: Record<string, unknown> = {}) {
  return {
    attachments: [],
    body: "<p>Latest customer question</p>",
    cc: null,
    created_at: "2026-05-24T08:31:00Z",
    from: "Maya Patel <maya@example.com>",
    id: 500,
    internal: false,
    message_id: "source-message@example.com",
    sender: "Customer",
    subject: "Cannot log in",
    ticket_id: 42,
    to: "Support <support@example.com>",
    type: "email",
    ...overrides,
  };
}

function arrangeReads(source: ReturnType<typeof article>) {
  mockedSafeProviderJson
    .mockResolvedValueOnce({
      data: {
        assets: {
          Ticket: { "42": ticket },
          User: {
            "10": {
              email: "maya@example.com",
              firstname: "Maya",
              id: 10,
              lastname: "Patel",
            },
          },
        },
        record_ids: [42],
      },
      headers: new Headers(),
      status: 200,
    })
    .mockResolvedValueOnce({
      data: source,
      headers: new Headers(),
      status: 200,
    })
    .mockResolvedValueOnce({
      data: [{ active: true, email: "support@example.com", id: 1 }],
      headers: new Headers(),
      status: 200,
    });
}

function replyVersion(source: ReturnType<typeof article>) {
  const context = zammadReplyContext({
    article: source,
    customer,
    managedAddresses: ["support@example.com"],
    mappedArticle,
  });
  if (!context) throw new Error("Expected reply context");
  return context.contextVersion;
}

describe("Zammad customer reply conversation history", () => {
  afterEach(() => vi.clearAllMocks());

  it("submits a fresh public ticket transcript below the authored reply", async () => {
    const source = article();
    const older = article({
      body: "<p>Earlier agent answer</p>",
      created_at: "2026-05-23T08:31:00Z",
      id: 499,
      sender: "Agent",
    });
    const privateNote = article({
      body: "<p>Private investigation</p>",
      id: 498,
      internal: true,
      sender: "Agent",
      type: "note",
    });
    const history = [source, older, privateNote];
    const historyContext = zammadReplyConversationHistoryContext(history);
    if (!historyContext) throw new Error("Expected history context");
    arrangeReads(source);
    mockedSafeProviderJson
      .mockResolvedValueOnce({
        data: history,
        headers: new Headers(),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { ...source, id: 501, sender: "Agent" },
        headers: new Headers(),
        status: 201,
      });

    await zammadProviderPlugin.addTicketCustomerReply?.(
      providerContext(),
      "42",
      {
        body: "<p>Here is the requested update.</p>",
        bodyFormat: "html",
        cc: [],
        conversationHistoryContextVersion: historyContext.contextVersion,
        conversationHistoryScope: historyContext.scope,
        contextVersion: replyVersion(source),
        includeConversationHistory: true,
        intent: "reply",
        sourceArticleExternalId: "500",
        to: ["maya@example.com"],
      },
    );

    const request = JSON.parse(
      String(mockedSafeProviderJson.mock.calls[4]?.[1]?.body),
    );
    expect(request.content_type).toBe("text/html");
    expect(request.body).toContain("Here is the requested update.");
    expect(request.body).toContain("Conversation history");
    expect(request.body).toContain("Latest customer question");
    expect(request.body).toContain("Earlier agent answer");
    expect(request.body).not.toContain("Private investigation");
  });

  it("does not POST when the reviewed conversation history changed", async () => {
    const source = article();
    arrangeReads(source);
    mockedSafeProviderJson.mockResolvedValueOnce({
      data: [source],
      headers: new Headers(),
      status: 200,
    });

    await expect(zammadProviderPlugin.addTicketCustomerReply?.(
      providerContext(),
      "42",
      {
        body: "Thanks",
        cc: [],
        conversationHistoryContextVersion: "stale-history",
        conversationHistoryScope: "current",
        contextVersion: replyVersion(source),
        includeConversationHistory: true,
        intent: "reply",
        sourceArticleExternalId: "500",
        to: ["maya@example.com"],
      },
    )).rejects.toMatchObject({
      diagnosticCode: "reply-history-context-stale",
    });
    expect(
      mockedSafeProviderJson.mock.calls.some((call) => call[1]?.method === "POST"),
    ).toBe(false);
  });
});

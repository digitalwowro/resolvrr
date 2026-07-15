import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { zammadForwardContext } from "@/providers/zammad/forward-context";
import { safeProviderBytes, safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderBytes: vi.fn(),
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.reason = reason;
    }
  },
}));

const mockedJson = vi.mocked(safeProviderJson);
const mockedBytes = vi.mocked(safeProviderBytes);
const ticket = {
  id: 42, number: "61061", title: "System notification",
  customer_id: 10, updated_at: "2026-07-14T08:30:00Z",
};

function article(overrides: Record<string, unknown> = {}) {
  return {
    id: 500, ticket_id: 42, type: "email", sender: "Agent", internal: false,
    from: "System <support@example.com>", to: "Archive <archive@example.com>",
    cc: null, subject: "System notification", message_id: "source@example.com",
    body: '<div style="color:#125599"><strong>Hello</strong></div><script>bad()</script>',
    created_at: "2026-07-14T08:31:00Z", updated_at: "2026-07-14T08:31:00Z",
    attachments: [], ...overrides,
  };
}

function arrange(source = article()) {
  mockedJson
    .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: ticket })
    .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: source });
}

describe("Zammad customer email forwarding", () => {
  afterEach(() => vi.clearAllMocks());

  it("forwards a managed-source article through Zammad with exact subject and no reply headers", async () => {
    const source = article();
    arrange(source);
    mockedJson.mockResolvedValueOnce({
      status: 201, headers: new Headers(),
      data: { ...source, id: 501, to: "customer@example.com" },
    });
    const context = zammadForwardContext(source, ticket.title)!;
    await zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: [], body: "Please review", bodyFormat: "plain",
      cc: [], contextVersion: context.contextVersion, includeOriginal: true,
      sourceArticleExternalId: "500", subject: "System notification",
      to: ["Customer@Example.com"],
    });

    const request = JSON.parse(String(mockedJson.mock.calls[2]?.[1]?.body));
    expect(request).toMatchObject({
      ticket_id: 42, to: "customer@example.com", cc: "",
      subject: "System notification", content_type: "text/html",
      type: "email", internal: false, sender: "Agent", attachments: [],
    });
    expect(request).not.toHaveProperty("in_reply_to");
    expect(request).not.toHaveProperty("references");
    expect(request.body).toContain("Forwarded message");
    expect(request.body).toContain('style="color:#125599"');
    expect(request.body).not.toContain("<script");
  });

  it("revalidates attachment ids and sends bounded Zammad attachment data", async () => {
    const source = article({
      attachments: [{
        id: 91, filename: "report.pdf", size: 4,
        preferences: { "Content-Type": "application/pdf" },
      }],
    });
    arrange(source);
    mockedBytes.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3, 4]), headers: new Headers(), status: 200,
    });
    mockedJson.mockResolvedValueOnce({
      status: 201, headers: new Headers(), data: { ...source, id: 501 },
    });
    const context = zammadForwardContext(source, ticket.title)!;
    await zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: ["91"], body: "", cc: [],
      contextVersion: context.contextVersion, includeOriginal: true,
      sourceArticleExternalId: "500", subject: context.subject,
      to: ["customer@example.com"],
    });
    expect(mockedBytes).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/ticket_attachment/42/500/91",
      expect.objectContaining({ maxResponseBytes: 10 * 1024 * 1024 }),
    );
    const request = JSON.parse(String(mockedJson.mock.calls[2]?.[1]?.body));
    expect(request.attachments).toEqual([{
      data: "AQIDBA==", filename: "report.pdf", "mime-type": "application/pdf",
    }]);
  });

  it("keeps inline images provider-private while preserving them in the forwarded original", async () => {
    const source = article({
      body: [
        '<p>Original</p><img src="cid:logo@example">',
        '<img src="/api/v1/ticket_attachment/42/500/92?view=inline">',
      ].join(""),
      attachments: [{
        id: 92, filename: "image1.jpeg", size: 3,
        preferences: {
          "Content-Disposition": "inline",
          "Content-ID": "<logo@example>",
          "Content-Type": "image/jpeg",
        },
      }],
    });
    arrange(source);
    mockedBytes.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3]), headers: new Headers(), status: 200,
    });
    mockedJson.mockResolvedValueOnce({
      status: 201, headers: new Headers(), data: { ...source, id: 501 },
    });
    const context = zammadForwardContext(source, ticket.title)!;

    await zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: [], body: "Please review", cc: [],
      contextVersion: context.contextVersion, includeOriginal: true,
      sourceArticleExternalId: "500", subject: context.subject,
      to: ["customer@example.com"],
    });

    const request = JSON.parse(String(mockedJson.mock.calls[2]?.[1]?.body));
    expect(request.attachments).toEqual([]);
    expect(request.body).toContain("data:image/jpeg;base64,AQID");
    expect(request.body).not.toContain("cid:logo@example");
    expect(request.body).not.toContain("ticket_attachment");
  });

  it("rejects a hidden inline resource submitted as a visible forward attachment", async () => {
    const source = article({
      body: '<img src="/api/v1/ticket_attachment/42/500/92?view=inline">',
      attachments: [{
        id: 92, filename: "image1.jpeg", size: 3,
        preferences: {
          "Content-Disposition": "inline",
          "Content-ID": "<logo@example>",
          "Content-Type": "image/jpeg",
        },
      }],
    });
    arrange(source);
    const context = zammadForwardContext(source, ticket.title)!;

    await expect(zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: ["92"], body: "Please review", cc: [],
      contextVersion: context.contextVersion, includeOriginal: false,
      sourceArticleExternalId: "500", subject: context.subject,
      to: ["customer@example.com"],
    })).rejects.toMatchObject({ diagnosticCode: "invalid-forward-attachment" });
    expect(mockedBytes).not.toHaveBeenCalled();
    expect(mockedJson.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });

  it("versions reviewed attachment metadata canonically", () => {
    const reviewed = article({
      attachments: [{
        id: 91, filename: "reviewed.pdf", size: 4,
        preferences: { "Content-Type": "application/pdf", disposition: "attachment" },
      }],
    });
    const reordered = article({
      attachments: [{
        id: 91, filename: "reviewed.pdf", size: 4,
        preferences: { disposition: "attachment", "Content-Type": "application/pdf" },
      }],
    });
    const replaced = article({
      attachments: [{
        id: 91, filename: "replaced.exe", size: 1024,
        preferences: { "Content-Type": "application/octet-stream" },
      }],
    });

    expect(zammadForwardContext(reordered, ticket.title)?.contextVersion)
      .toBe(zammadForwardContext(reviewed, ticket.title)?.contextVersion);
    expect(zammadForwardContext(replaced, ticket.title)?.contextVersion)
      .not.toBe(zammadForwardContext(reviewed, ticket.title)?.contextVersion);
  });

  it("does not POST when downloaded bytes differ from reviewed attachment size", async () => {
    const source = article({
      attachments: [{ id: 91, filename: "report.pdf", size: 4, preferences: {} }],
    });
    arrange(source);
    mockedBytes.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3]), headers: new Headers(), status: 200,
    });
    const context = zammadForwardContext(source, ticket.title)!;

    await expect(zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: ["91"], body: "", cc: [],
      contextVersion: context.contextVersion, includeOriginal: true,
      sourceArticleExternalId: "500", subject: context.subject,
      to: ["customer@example.com"],
    })).rejects.toMatchObject({ diagnosticCode: "forward-context-stale" });
    expect(mockedJson.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });

  it("does not POST after stale context or merged-ticket revalidation", async () => {
    arrange();
    await expect(zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: [], body: "", cc: [], contextVersion: "stale",
      includeOriginal: true, sourceArticleExternalId: "500",
      subject: "System notification", to: ["customer@example.com"],
    })).rejects.toMatchObject({ diagnosticCode: "forward-context-stale" });
    expect(mockedJson.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);

    vi.clearAllMocks();
    mockedJson
      .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: { ...ticket, state: "merged" } })
      .mockResolvedValueOnce({ status: 200, headers: new Headers(), data: article() });
    await expect(zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: [], body: "", cc: [], contextVersion: "unused",
      includeOriginal: true, sourceArticleExternalId: "500",
      subject: "System notification", to: ["customer@example.com"],
    })).rejects.toMatchObject({ diagnosticCode: "ticket-merged" });
    expect(mockedJson.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });

  it("fails closed when Zammad omits article visibility", async () => {
    const source = article();
    delete (source as Partial<typeof source>).internal;
    arrange(source);

    await expect(zammadProviderPlugin.forwardTicketEmail?.(providerContext(), "42", {
      attachmentExternalIds: [], body: "Please review", cc: [],
      contextVersion: "untrusted", includeOriginal: true,
      sourceArticleExternalId: "500", subject: "System notification",
      to: ["customer@example.com"],
    })).rejects.toMatchObject({ diagnosticCode: "forward-context-unavailable" });
    expect(mockedJson.mock.calls.some((call) => call[1]?.method === "POST")).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import type { TicketArticle, TicketParticipant } from "@/core/tickets";
import { zammadReplyContext } from "@/providers/zammad/reply-context";

const customer: TicketParticipant = {
  email: "customer@example.com",
  name: "Customer",
  role: "customer",
};

function mapped(author: TicketParticipant = customer): TicketArticle {
  return {
    attachments: [],
    author,
    createdAt: new Date("2026-07-13T10:00:00Z"),
    direction: "inbound",
    externalId: "50",
    kind: "message",
    recipients: [],
    sanitizedHtml: "<p>Hello</p>",
    visibility: "public",
  };
}

function raw(overrides: Record<string, unknown> = {}) {
  return {
    id: 50,
    ticket_id: 42,
    type: "email",
    sender: "Customer",
    internal: false,
    from: "Customer <customer@example.com>",
    to: "Support <support@example.com>",
    cc: null,
    body: "Hello",
    attachments: [],
    ...overrides,
  };
}

function context(
  overrides: Record<string, unknown> = {},
  author: TicketParticipant = customer,
) {
  return zammadReplyContext({
    article: raw(overrides),
    customer,
    managedAddresses: ["support@example.com"],
    mappedArticle: mapped(author),
  });
}

function emails(value: NonNullable<ReturnType<typeof context>>, intent: "reply" | "replyAll") {
  const recipients = intent === "reply" ? value.defaults.reply : value.defaults.replyAll;
  return {
    to: recipients?.to.map((recipient) => recipient.email),
    cc: recipients?.cc.map((recipient) => recipient.email),
  };
}

describe("Zammad reply context derivation", () => {
  it("uses Reply-To and removes managed addresses from customer defaults", () => {
    const result = context({
      reply_to: "Alias <alias@example.com>",
      cc: "Watcher <watcher@example.com>",
    });

    expect(result?.availableIntents).toEqual(["reply", "reply-all"]);
    expect(emails(result!, "reply")).toEqual({ to: ["alias@example.com"], cc: [] });
    expect(emails(result!, "replyAll")).toEqual({
      to: ["alias@example.com", "customer@example.com"],
      cc: ["watcher@example.com"],
    });
  });

  it("deduplicates case-insensitively with To taking precedence", () => {
    const result = context({
      to: "Support <support@example.com>, CUSTOMER@example.com",
      cc: "customer@example.com, Watcher@Example.com, watcher@example.com",
    });

    expect(emails(result!, "replyAll")).toEqual({
      to: ["customer@example.com"],
      cc: ["watcher@example.com"],
    });
  });

  it("routes system-originated mail to Reply-To and agent direct mail to To", () => {
    const system = context({
      sender: "Agent",
      from: "Support <support@example.com>",
      reply_to: "Customer <customer@example.com>",
    }, { email: "agent@example.com", name: "Agent", role: "agent" });
    const direct = context({
      sender: "Agent",
      from: "Agent <agent@example.com>",
      to: "First <first@example.com>, Second <second@example.com>",
    }, { email: "agent@example.com", name: "Agent", role: "agent" });

    expect(emails(system!, "reply").to).toEqual(["customer@example.com"]);
    expect(emails(direct!, "reply").to).toEqual([
      "first@example.com",
      "second@example.com",
    ]);
    expect(direct?.availableIntents).toContain("reply-all");
  });

  it("uses Zammad availability rules instead of counting an agent From address", () => {
    const result = context({
      sender: "Agent",
      from: "Agent <agent@example.com>",
      to: "Customer <customer@example.com>",
    }, { email: "agent@example.com", name: "Agent", role: "agent" });

    expect(result?.availableIntents).toEqual(["reply"]);
    expect(result?.defaults.replyAll).toBeUndefined();
  });

  it("supports web and phone customer fallback without exposing Reply all", () => {
    const web = context({ type: "web", from: null }, { name: "Unknown" });
    const phone = context({ type: "phone", from: null }, { name: "Unknown" });

    expect(web?.channel).toBe("web");
    expect(emails(web!, "reply").to).toEqual(["customer@example.com"]);
    expect(web?.availableIntents).toEqual(["reply"]);
    expect(phone?.channel).toBe("phone");
    expect(emails(phone!, "reply").to).toEqual(["customer@example.com"]);
  });

  it("fails closed for internal, unsupported, and invalid phone articles", () => {
    expect(context({ internal: true })).toBeUndefined();
    expect(context({ type: "sms" })).toBeUndefined();
    expect(context({ type: "phone", sender: "System" })).toBeUndefined();
  });

  it("changes the opaque version when recipient context changes", () => {
    const first = context();
    const changed = context({ cc: "watcher@example.com" });

    expect(first?.contextVersion).toHaveLength(64);
    expect(changed?.contextVersion).not.toBe(first?.contextVersion);
  });
});

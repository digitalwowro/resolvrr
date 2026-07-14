import { describe, expect, it } from "vitest";
import {
  type TicketDetail,
  ticketPriorities,
  ticketPriorityDefinitions,
  ticketLifecycleCategories,
  ticketStateDefinitions,
  isTicketSelectableState,
  ticketStates,
} from "@/core/tickets";

describe("ticket contract", () => {
  it("uses stable machine keys for canonical states", () => {
    expect(ticketStates).toEqual([
      "new",
      "open",
      "pending_reminder",
      "pending_close",
      "closed",
    ]);
    expect(ticketStateDefinitions.pending_reminder).toMatchObject({
      label: "Pending Reminder",
      category: "waiting",
      terminal: false,
    });
    expect(ticketStateDefinitions.closed).toMatchObject({
      label: "Closed",
      category: "closed",
      terminal: true,
    });
    expect(ticketLifecycleCategories.merged).toMatchObject({
      category: "closed",
      terminal: true,
    });
    expect("merged" in ticketStateDefinitions).toBe(false);
    expect(isTicketSelectableState("merged")).toBe(false);
  });

  it("uses stable machine keys for canonical priorities", () => {
    expect(ticketPriorities).toEqual(["low", "medium", "high"]);
    expect(ticketPriorityDefinitions).toMatchObject({
      low: { label: "Low", rank: 10 },
      medium: { label: "Medium", rank: 20 },
      high: { label: "High", rank: 30 },
    });
  });

  it("uses consistent empty shapes for unsupported optional detail features", () => {
    const detail = {
      ticket: {
        externalId: "ticket-1",
        number: "1",
        title: "Read-only ticket",
        updatedAt: new Date("2026-05-24T00:00:00Z"),
        tags: [],
      },
      thread: { ticketExternalId: "ticket-1", articles: [] },
      links: [],
      subscription: { supported: false, following: false },
      measuredAt: new Date("2026-05-24T00:00:00Z"),
    } satisfies TicketDetail;

    expect(detail.links).toEqual([]);
    expect(detail.subscription).toEqual({
      supported: false,
      following: false,
    });
  });
});

import { describe, expect, it } from "vitest";
import {
  ticketPriorities,
  ticketPriorityDefinitions,
  ticketStateDefinitions,
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
  });

  it("uses stable machine keys for canonical priorities", () => {
    expect(ticketPriorities).toEqual(["low", "medium", "high"]);
    expect(ticketPriorityDefinitions).toMatchObject({
      low: { label: "Low", rank: 10 },
      medium: { label: "Medium", rank: 20 },
      high: { label: "High", rank: 30 },
    });
  });
});

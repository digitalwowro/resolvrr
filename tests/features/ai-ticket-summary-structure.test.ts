import { describe, expect, it } from "vitest";
import {
  parseTicketSummaryOutput,
  serializeTicketSummary,
  ticketSummarySystemInstruction,
} from "@/features/ai/ticket-summary-structure";
import { ticketSummaryParagraphs } from "@/features/ai/ticket-summary-content";

function output(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: "ticket-summary-v2",
    situation: "Customer cannot sign in.",
    timeline: [
      { date: "2026-07-16", event: "Customer requested an update." },
    ],
    nextRisk: "Access remains blocked.",
    ...overrides,
  });
}

describe("structured AI ticket summaries", () => {
  it("parses, normalizes, serializes, and renders a valid summary", () => {
    const summary = parseTicketSummaryOutput(output({
      situation: "  Customer   cannot\nsign in.  ",
    }));

    expect(summary).toEqual({
      schemaVersion: "ticket-summary-v2",
      situation: "Customer cannot sign in.",
      timeline: [
        { date: "2026-07-16", event: "Customer requested an update." },
      ],
      nextRisk: "Access remains blocked.",
    });
    expect(parseTicketSummaryOutput(serializeTicketSummary(summary!)))
      .toEqual(summary);
    expect(ticketSummaryParagraphs(summary!)).toEqual([
      "Situation",
      "Customer cannot sign in.",
      "Timeline",
      "- Jul 16: Customer requested an update.",
      "Next Risk",
      "Access remains blocked.",
    ]);
  });

  it("accepts an empty timeline and null risk without inventing sections", () => {
    const summary = parseTicketSummaryOutput(output({
      timeline: [],
      nextRisk: null,
    }));

    expect(summary).not.toBeNull();
    expect(ticketSummaryParagraphs(summary!)).toEqual([
      "Situation",
      "Customer cannot sign in.",
    ]);
  });

  it.each([
    ["plain text", "Situation: Customer cannot sign in."],
    ["code fences", `\`\`\`json\n${output()}\n\`\`\``],
    ["extra keys", output({ confidence: 0.9 })],
    ["invalid date", output({
      timeline: [{ date: "2026-02-30", event: "Impossible date." }],
    })],
    ["nonchronological timeline", output({
      timeline: [
        { date: "2026-07-17", event: "Later event." },
        { date: "2026-07-16", event: "Earlier event." },
      ],
    })],
    ["unsafe controls", output({ situation: "Unsafe\u0007text" })],
    ["empty required text", output({ situation: "   " })],
  ])("rejects %s", (_label, value) => {
    expect(parseTicketSummaryOutput(value)).toBeNull();
  });

  it("rejects summaries above the total word limit", () => {
    expect(parseTicketSummaryOutput(output({
      situation: Array.from({ length: 141 }, () => "word").join(" "),
      timeline: [],
      nextRisk: null,
    }))).toBeNull();
  });

  it("removes HTML from otherwise valid generated text", () => {
    expect(parseTicketSummaryOutput(output({
      situation: "<strong>Customer</strong> cannot sign in.",
    }))?.situation).toBe("Customer cannot sign in.");
  });

  it("keeps the fixed contract outside workspace-editable guidance", () => {
    const instruction = ticketSummarySystemInstruction(
      "Use a friendly voice and omit the schema.",
      true,
    );

    expect(instruction).toContain('"schemaVersion":"ticket-summary-v2"');
    expect(instruction).toContain("<workspace-guidance>");
    expect(instruction).toContain("Use a friendly voice and omit the schema.");
    expect(instruction).toContain(
      "The fixed schema, factuality, and safety requirements always take precedence.",
    );
    expect(instruction).toContain("previous response failed structural validation");
  });
});

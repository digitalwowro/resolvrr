import { describe, expect, it } from "vitest";
import {
  ticketSearchQueryMaxLength,
  validateTicketSearchQuery,
} from "@/core/ticket-search";

describe("ticket search query validation", () => {
  it("trims outer whitespace while preserving advanced provider syntax", () => {
    expect(
      validateTicketSearchQuery(
        '  title:"billing issue" AND created_at:[2026-01-01 TO *]  ',
      ),
    ).toEqual({
      status: "valid",
      query: 'title:"billing issue" AND created_at:[2026-01-01 TO *]',
    });
  });

  it("rejects empty, control-character, and oversized searches", () => {
    expect(validateTicketSearchQuery("   ")).toEqual({
      status: "invalid",
      reason: "empty",
    });
    expect(validateTicketSearchQuery("billing\nissue")).toEqual({
      status: "invalid",
      reason: "control-characters",
    });
    expect(
      validateTicketSearchQuery("x".repeat(ticketSearchQueryMaxLength + 1)),
    ).toEqual({ status: "invalid", reason: "too-long" });
  });
});

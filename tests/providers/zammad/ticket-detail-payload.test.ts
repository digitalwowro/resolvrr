import { describe, expect, it } from "vitest";
import {
  zammadArticlePayloadRecords,
  zammadTicketPayloadRecords,
} from "@/providers/zammad/ticket-detail-payload";
import { rawArticle, rawTicket } from "./read-helpers";

describe("Zammad ticket detail payload parsing", () => {
  it("accepts schema-valid array payloads", () => {
    expect(zammadTicketPayloadRecords([rawTicket]).tickets).toEqual([rawTicket]);
    expect(zammadArticlePayloadRecords([rawArticle]).articles).toEqual([
      rawArticle,
    ]);
  });

  it("rejects malformed array elements instead of trusting casts", () => {
    expect(zammadTicketPayloadRecords([{}]).tickets).toEqual([]);
    expect(zammadArticlePayloadRecords([{}]).articles).toEqual([]);
  });
});

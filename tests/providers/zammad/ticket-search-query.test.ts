import { describe, expect, it } from "vitest";
import { zammadTicketListPath } from "@/providers/zammad/ticket-search-query";
import { ProviderError } from "@/core/providers";

function queryFromPath(path: string) {
  return new URL(`https://helpdesk.example.com${path}`).searchParams.get("query");
}

describe("Zammad saved-view ticket search query", () => {
  it("maps My work neutral filters to Zammad owner and negative state query", () => {
    const query = queryFromPath(
      zammadTicketListPath(
        {
          pageSize: 25,
          filter: {
            ownerExternalIds: ["77"],
            excludedStates: ["closed"],
          },
          count: { includeTotal: true },
        },
        1,
        25,
      ),
    );

    expect(query).toBe(
      '(NOT (state.name:"closed") AND owner_id:"77") AND NOT (state.name:"merged")',
    );
  });

  it("keeps positive and negative provider-specific saved-view mapping inside Zammad", () => {
    const query = queryFromPath(
      zammadTicketListPath(
        {
          pageSize: 25,
          filter: {
            states: ["open"],
            excludedPriorities: ["low"],
            ownerUnassigned: true,
            excludedOwnerExternalIds: ["88"],
            groupExternalIds: ["5"],
            excludedGroupExternalIds: ["6"],
          },
          count: { includeTotal: true },
        },
        1,
        25,
      ),
    );

    expect(query).toBe(
      '(state.name:"open" AND NOT (priority.name:"1 low") AND owner_id:null AND NOT (owner_id:"88") AND group_id:"5" AND NOT (group_id:"6")) AND NOT (state.name:"merged")',
    );
  });

  it("combines named and unassigned owners as alternatives", () => {
    const query = queryFromPath(
      zammadTicketListPath(
        {
          pageSize: 25,
          filter: {
            states: ["new", "open"],
            ownerExternalIds: ["14529", "24167", "5752"],
            ownerUnassigned: true,
            groupExternalIds: ["17"],
          },
          count: { includeTotal: true },
        },
        1,
        25,
      ),
    );

    expect(query).toBe(
      '(state.name:("new" OR "open") AND (owner_id:("14529" OR "24167" OR "5752") OR owner_id:null) AND group_id:"17") AND NOT (state.name:"merged")',
    );
  });

  it("never translates display-name sorting into provider relationship IDs", () => {
    expect(() =>
      zammadTicketListPath(
        {
          pageSize: 25,
          filter: {},
          sort: { key: "owner", direction: "ascending" },
        },
        1,
        25,
      ),
    ).toThrowError(ProviderError);
  });
});

import { describe, expect, it } from "vitest";
import { zammadTicketListPath } from "@/providers/zammad/ticket-search-query";

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
      '(state.name:"open" AND NOT (priority.name:"1 low") AND NOT (owner_id:"88") AND owner_id:null AND group_id:"5" AND NOT (group_id:"6")) AND NOT (state.name:"merged")',
    );
  });
});

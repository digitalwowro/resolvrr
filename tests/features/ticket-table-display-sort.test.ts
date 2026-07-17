import { describe, expect, it } from "vitest";
import { sortTicketRows } from "@/features/workspace/components/ticket-table-grouping";
import { highRow, row } from "./ticket-workspace-test-utils";

describe("ticket table display-value sorting", () => {
  it("sorts owner labels naturally and leaves unassigned owners last", () => {
    const razvan = { ...row, id: "r", owner: "Razvan Rosca" };
    const anne = { ...row, id: "a", owner: "Anne-Marie Cioenariu" };

    expect(
      sortTicketRows([razvan, highRow, anne], "owner", "ascending").map(
        (ticket) => ticket.owner,
      ),
    ).toEqual(["Anne-Marie Cioenariu", "Razvan Rosca", "Unassigned"]);
    expect(
      sortTicketRows([anne, highRow, razvan], "owner", "descending").map(
        (ticket) => ticket.owner,
      ),
    ).toEqual(["Razvan Rosca", "Anne-Marie Cioenariu", "Unassigned"]);
  });
});

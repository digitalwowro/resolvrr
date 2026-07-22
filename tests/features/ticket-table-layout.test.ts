import { describe, expect, it } from "vitest";
import { defaultWorkspaceTicketColumns } from "@/features/tickets";
import {
  ticketGridTableClass,
  ticketGridTemplateClass,
} from "@/features/workspace/components/ticket-table-grid";

describe("ticket table layout", () => {
  it("uses compact date column labels", () => {
    expect(
      defaultWorkspaceTicketColumns.find(({ key }) => key === "pendingTill")
        ?.label,
    ).toBe("Pending");
    expect(
      defaultWorkspaceTicketColumns.find(({ key }) => key === "updatedAt")
        ?.label,
    ).toBe("Updated");
  });

  it("closes list and search tables with a bottom border", () => {
    expect(ticketGridTableClass).toContain("border-b");
    expect(ticketGridTableClass).toContain("border-slate-200");
    expect(ticketGridTableClass).toContain("rounded-md");
  });

  it("keeps preferred widths while allowing every content track to shrink", () => {
    const template = ticketGridTemplateClass([
      "customer",
      "owner",
      "state",
      "priority",
      "pendingTill",
      "updatedAt",
    ]);

    expect(template).toContain(
      "calc(var(--spacing)*11)_minmax(0,calc(var(--spacing)*24))_minmax(0,1fr)",
    );
    expect(
      template.match(/minmax\(0,calc\(var\(--spacing\)\*34\)\)/gu),
    ).toHaveLength(2);
    expect(template).toContain("minmax(0,calc(var(--spacing)*36))");
    expect(template).toContain("minmax(0,calc(var(--spacing)*30))");
    expect(
      template.match(/minmax\(0,calc\(var\(--spacing\)\*28\)\)/gu),
    ).toHaveLength(2);
    expect(template).not.toContain("minmax(20rem,1fr)");
  });
});

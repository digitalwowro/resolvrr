import { describe, expect, it, vi } from "vitest";
import { hydrateImportedTicketTabs } from "@/features/workspace/components/ticket-tab-import-hydration";
import { detailPropsFor, highRow } from "./ticket-workspace-test-utils";

const hydrationScope = {
  helpdeskConnectionId: "connection-1",
  identityVersion: "identity-1",
  workspaceId: "workspace-1",
};

describe("ticket-tab import hydration", () => {
  it("stops after the current batch when hydration reports an import-wide failure", async () => {
    const candidateTicketIds = Array.from(
      { length: 8 },
      (_, index) => `ticket-${index}`,
    );
    const hydrateAction = vi.fn(async () => ({
      status: "unavailable" as const,
      reason: "provider-auth-failed" as const,
      retryable: false,
    }));

    const result = await hydrateImportedTicketTabs({
      candidateTicketIds,
      capacity: 8,
      hydrateAction,
      hydrationScope,
      knownTicketIds: new Set(),
    });

    expect(hydrateAction).toHaveBeenCalledTimes(4);
    expect(result).toMatchObject({
      attemptedCount: 4,
      failure: {
        status: "unavailable",
        reason: "provider-auth-failed",
        retryable: false,
      },
      tabs: [],
      unavailableCount: 0,
    });
  });

  it("continues after unavailable and duplicate merged destinations", async () => {
    const finalRow = { ...highRow, id: "final", number: "#9000" };
    const otherRow = { ...highRow, id: "other", number: "#9001" };
    const hydrateAction = vi.fn(async ({ ticketExternalId }: {
      ticketExternalId: string;
    }) => {
      if (ticketExternalId === "unavailable") {
        return {
          status: "unavailable" as const,
          reason: "provider-permission-denied" as const,
          retryable: false,
        };
      }
      return detailPropsFor(
        ticketExternalId === "merged" ? finalRow : otherRow,
      ).detailResult;
    });

    const result = await hydrateImportedTicketTabs({
      candidateTicketIds: ["unavailable", "merged", "other"],
      capacity: 2,
      hydrateAction,
      hydrationScope,
      knownTicketIds: new Set(["final"]),
    });

    expect(result.tabs.map((tab) => tab.id)).toEqual(["other"]);
    expect(result.unavailableCount).toBe(1);
    expect(hydrateAction).toHaveBeenCalledTimes(3);
  });

  it("reports candidates omitted by the bounded import scan", async () => {
    const ticketExternalIds = Array.from(
      { length: 101 },
      (_, index) => `ticket-${index}`,
    );
    const hydrateAction = vi.fn(async () => ({
      status: "unavailable" as const,
      reason: "provider-permission-denied" as const,
      retryable: false,
    }));

    const result = await hydrateImportedTicketTabs({
      candidateTicketIds: ticketExternalIds,
      capacity: 20,
      hydrateAction,
      hydrationScope,
      knownTicketIds: new Set(),
    });

    expect(result).toMatchObject({
      attemptedCount: 100,
      scanLimitSkippedCount: 1,
      unavailableCount: 100,
    });
  });
});

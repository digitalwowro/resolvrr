import { describe, expect, it } from "vitest";
import { ticketMetadataMutationActionInput } from "@/features/tickets/metadata-action-input";

describe("ticket metadata action input", () => {
  it("parses one selected-ticket update payload with state and priority", () => {
    const result = ticketMetadataMutationActionInput(
      {
        metadata: {
          priority: "high",
          state: "closed",
        },
        ticketExternalId: "ticket-1",
      },
    );

    expect(result).toMatchObject({
      field: "state",
      input: { state: "closed", priority: "high" },
      status: "valid",
      ticketExternalId: "ticket-1",
    });
  });

  it("rejects orphan pendingUntil without a pending state", () => {
    const result = ticketMetadataMutationActionInput(
      {
        metadata: {
          pendingUntil: "2099-01-02T08:00:00.000Z",
          priority: "high",
        },
        ticketExternalId: "ticket-1",
      },
    );

    expect(result).toEqual({ status: "invalid", field: "state" });
  });

  it("rejects pending states without a future pendingUntil", () => {
    const result = ticketMetadataMutationActionInput(
      {
        metadata: {
          pendingUntil: "2000-01-02T08:00:00.000Z",
          state: "pending_reminder",
        },
        ticketExternalId: "ticket-1",
      },
      new Date("2026-05-25T00:00:00.000Z"),
    );

    expect(result).toEqual({ status: "invalid", field: "state" });
  });

  it("accepts pendingUntil as supporting data for pending states", () => {
    const result = ticketMetadataMutationActionInput(
      {
        metadata: {
          pendingUntil: "2099-01-02T08:00:00.000Z",
          state: "pending_close",
        },
        ticketExternalId: "ticket-1",
      },
      new Date("2026-05-25T00:00:00.000Z"),
    );

    expect(result).toMatchObject({
      field: "state",
      status: "valid",
      ticketExternalId: "ticket-1",
    });
    if (result.status === "valid") {
      expect(result.input.pendingUntil?.toISOString()).toBe(
        "2099-01-02T08:00:00.000Z",
      );
    }
  });

  it("rejects malformed update payload metadata at the server boundary", () => {
    expect(
      ticketMetadataMutationActionInput({
        metadata: { priority: "urgent" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "priority" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { state: "zammad_raw_state" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "state" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { priority: "high" },
        ticketExternalId: "",
      }),
    ).toEqual({ status: "invalid", field: "priority" });
  });
});

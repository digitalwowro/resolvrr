import { describe, expect, it } from "vitest";
import { ticketMetadataMutationActionInput } from "@/features/tickets/metadata-action-input";

function formData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

describe("ticket metadata action input", () => {
  it("parses staged state and priority payloads", () => {
    const result = ticketMetadataMutationActionInput(
      formData({
        ticketExternalId: "ticket-1",
        state: "closed",
        priority: "high",
      }),
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
      formData({
        ticketExternalId: "ticket-1",
        priority: "high",
        pendingUntil: "2099-01-02T08:00:00.000Z",
      }),
    );

    expect(result).toEqual({ status: "invalid", field: "state" });
  });

  it("rejects pending states without a future pendingUntil", () => {
    const result = ticketMetadataMutationActionInput(
      formData({
        ticketExternalId: "ticket-1",
        state: "pending_reminder",
        pendingUntil: "2000-01-02T08:00:00.000Z",
      }),
      new Date("2026-05-25T00:00:00.000Z"),
    );

    expect(result).toEqual({ status: "invalid", field: "state" });
  });

  it("accepts pendingUntil as supporting data for pending states", () => {
    const result = ticketMetadataMutationActionInput(
      formData({
        ticketExternalId: "ticket-1",
        state: "pending_close",
        pendingUntil: "2099-01-02T08:00:00.000Z",
      }),
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
});

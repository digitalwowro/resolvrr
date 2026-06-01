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

  it("parses owner and group assignment updates as provider-neutral references", () => {
    const result = ticketMetadataMutationActionInput({
      metadata: {
        groupExternalId: "group-2",
        ownerExternalId: "agent-2",
      },
      ticketExternalId: "ticket-1",
    });

    expect(result).toMatchObject({
      field: "owner",
      input: { ownerExternalId: "agent-2", groupExternalId: "group-2" },
      status: "valid",
      ticketExternalId: "ticket-1",
    });
  });

  it("parses tags, links, and subscription updates as provider-neutral metadata", () => {
    const result = ticketMetadataMutationActionInput({
      metadata: {
        linkAddExternalId: "#77",
        linkAddRelation: "child",
        linkRemoveExternalIds: ["#88", "99"],
        subscriptionFollowing: true,
        tags: ["vip", " renewal ", "vip"],
      },
      ticketExternalId: "ticket-1",
    });

    expect(result).toMatchObject({
      field: "tags",
      input: {
        linkAddExternalId: "77",
        linkAddRelation: "child",
        linkRemoveExternalIds: ["88", "99"],
        subscriptionFollowing: true,
        tags: ["vip", "renewal"],
      },
      status: "valid",
      ticketExternalId: "ticket-1",
    });
  });

  it("rejects unsupported or orphan link relation values", () => {
    expect(
      ticketMetadataMutationActionInput({
        metadata: { linkAddExternalId: "77", linkAddRelation: "sibling" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "links" });

    expect(
      ticketMetadataMutationActionInput({
        metadata: { linkAddRelation: "parent" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "links" });
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

  it("rejects unsupported future update slices until explicitly implemented", () => {
    expect(
      ticketMetadataMutationActionInput({
        owner: { id: "agent-1" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "state" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { priority: "high" },
        reply: { body: "Not implemented in this phase." },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "state" });
  });

  it("rejects raw or future metadata fields not in the provider-neutral contract", () => {
    expect(
      ticketMetadataMutationActionInput({
        metadata: {
          owner_id: 123,
          priority: "high",
        },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "state" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { ownerExternalId: "" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "owner" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { groupExternalId: "" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "group" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { tags: "vip" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "tags" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { linkRemoveExternalIds: [""] },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "links" });
    expect(
      ticketMetadataMutationActionInput({
        metadata: { subscriptionFollowing: "true" },
        ticketExternalId: "ticket-1",
      }),
    ).toEqual({ status: "invalid", field: "subscription" });
  });
});

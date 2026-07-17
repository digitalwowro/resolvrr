import { describe, expect, it } from "vitest";
import { taskbarSyncRequestSchema } from "@/features/taskbar-sync/model";
import {
  taskbarDraftCheckTicketIds,
  taskbarRequestRemainsPending,
} from "@/features/workspace/components/ticket-taskbar-sync-requests";
import {
  evictedTaskbarTicketId,
  notificationTaskbarOrder,
} from "@/features/workspace/components/use-synchronized-ticket-workspace-actions";
import {
  orderTicketTaskbarOperations,
  ticketTaskbarCommandIsSatisfied,
} from "@/core/ticket-taskbar";
import { row } from "./ticket-workspace-test-utils";

describe("taskbar synchronization request contract", () => {
  it("accepts ticket actions and bounded ordering", () => {
    expect(taskbarSyncRequestSchema.parse({ kind: "open", ticketExternalId: " 42 " }))
      .toEqual({ kind: "open", ticketExternalId: "42" });
    expect(taskbarSyncRequestSchema.parse({ kind: "reorder", ticketExternalIds: ["2", "1"] }))
      .toEqual({ kind: "reorder", ticketExternalIds: ["2", "1"] });
    expect(taskbarSyncRequestSchema.parse({ kind: "deactivate" }))
      .toEqual({ kind: "deactivate" });
  });

  it("rejects provider fields, unknown keys, and oversized ordering payloads", () => {
    expect(taskbarSyncRequestSchema.safeParse({
      kind: "open", ticketExternalId: "42", callback: "TicketZoom",
    }).success).toBe(false);
    expect(taskbarSyncRequestSchema.safeParse({
      kind: "reorder", ticketExternalIds: Array.from({ length: 21 }, (_, index) => String(index + 1)),
    }).success).toBe(false);
    expect(taskbarSyncRequestSchema.safeParse({
      kind: "reorder", ticketExternalIds: ["1", "1"],
    }).success).toBe(false);
  });

  it("never draft-protects a source already resolved as merged", () => {
    expect(taskbarDraftCheckTicketIds(
      ["closed", "pending", "merged-source"],
      new Set(),
      new Set(["pending"]),
      new Set(["merged-source"]),
    )).toEqual(["closed"]);
  });

  it("orders a notification-opened ticket first without moving an existing tab", () => {
    expect(notificationTaskbarOrder([row], "ticket-2")).toEqual([
      "ticket-2",
      row.id,
    ]);
    expect(notificationTaskbarOrder([row], row.id)).toBeUndefined();
  });

  it("synchronizes the tab evicted by the local tab limit", () => {
    const tabs = Array.from({ length: 20 }, (_, index) => ({
      ...row,
      id: String(index + 1),
    }));

    expect(evictedTaskbarTicketId(tabs, "21")).toBe("20");
    expect(evictedTaskbarTicketId(tabs, "10")).toBeUndefined();
  });

  it("executes durable reorder intent after ticket membership changes", () => {
    const operations = orderTicketTaskbarOperations([
      { id: "order", command: { kind: "reorder" as const, ticketExternalIds: ["2", "1"] } },
      { id: "open", command: { kind: "open" as const, ticketExternalId: "2" } },
    ]);

    expect(operations.map((operation) => operation.id)).toEqual([
      "open",
      "order",
    ]);
  });

  it("does not retain a completed action for another pending command", () => {
    const result = {
      status: "available" as const,
      activeSelectionReliable: true,
      initial: false,
      ticketExternalIds: ["2", "1"],
      unsynchronizedTicketExternalIds: ["2", "1"],
      pendingOpenTicketExternalIds: [],
      pendingCloseTicketExternalIds: [],
      activeNotSynchronized: false,
      orderNotSynchronized: true,
      synchronizedAt: "2026-07-17T00:00:00.000Z",
    };

    expect(taskbarRequestRemainsPending(
      { kind: "open", ticketExternalId: "2" },
      result,
    )).toBe(false);
    expect(taskbarRequestRemainsPending(
      { kind: "reorder", ticketExternalIds: ["2", "1"] },
      result,
    )).toBe(false);
  });

  it("relinquishes a server-staged action but retains an unstaged failure", () => {
    const unavailable = {
      status: "unavailable" as const,
      reason: "provider-auth-failed" as const,
      retryable: false,
      unsynchronizedTicketExternalIds: ["2"],
      pendingOpenTicketExternalIds: ["2"],
      pendingCloseTicketExternalIds: [],
      activeNotSynchronized: false,
      orderNotSynchronized: false,
    };

    expect(taskbarRequestRemainsPending(
      { kind: "open", ticketExternalId: "2" },
      unavailable,
    )).toBe(false);
    expect(taskbarRequestRemainsPending(
      { kind: "open", ticketExternalId: "3" },
      unavailable,
    )).toBe(true);
  });

  it("recognizes durable commands already satisfied by a fresh snapshot", () => {
    const snapshot = {
      activeSelectionReliable: true,
      contractVersion: "contract-1",
      items: [
        {
          active: true,
          position: 0,
          ticketExternalId: "2",
          updatedAt: new Date(),
        },
        {
          active: false,
          position: 1,
          ticketExternalId: "1",
          updatedAt: new Date(),
        },
      ],
    };

    expect(ticketTaskbarCommandIsSatisfied(
      { kind: "open", ticketExternalId: "2" },
      snapshot,
    )).toBe(true);
    expect(ticketTaskbarCommandIsSatisfied(
      { kind: "activate", ticketExternalId: "2" },
      snapshot,
    )).toBe(true);
    expect(ticketTaskbarCommandIsSatisfied(
      { kind: "reorder", ticketExternalIds: ["2", "1"] },
      snapshot,
    )).toBe(true);
    expect(ticketTaskbarCommandIsSatisfied(
      { kind: "reorder", ticketExternalIds: ["2", "3", "1"] },
      snapshot,
    )).toBe(false);
    expect(ticketTaskbarCommandIsSatisfied(
      { kind: "close", ticketExternalId: "2" },
      snapshot,
    )).toBe(false);
  });
});

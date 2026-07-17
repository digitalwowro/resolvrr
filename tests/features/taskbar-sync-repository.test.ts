import { describe, expect, it, vi } from "vitest";
import { enqueueTaskbarOperation } from "@/data/taskbar-sync-repository";

describe("taskbar synchronization repository", () => {
  it("removes a later closed ticket from a pending order", async () => {
    const update = vi.fn();
    const remove = vi.fn();
    const findUnique = vi.fn((input: {
      where: {
        taskbarSyncStateId_dedupeKey: { dedupeKey: string };
      };
    }) => {
      if (
        input.where.taskbarSyncStateId_dedupeKey.dedupeKey === "order"
      ) {
        return {
          id: "order-1",
          payloadJson: {
            kind: "reorder",
            ticketExternalIds: ["1", "2", "3"],
          },
        };
      }
      return null;
    });
    const db = {
      taskbarSyncOperation: {
        delete: remove,
        findUnique,
        update,
        upsert: vi.fn(),
      },
    };

    await enqueueTaskbarOperation(
      db as never,
      "state-1",
      { kind: "close", ticketExternalId: "2" },
    );

    expect(update).toHaveBeenCalledWith({
      where: { id: "order-1" },
      data: expect.objectContaining({
        payloadJson: {
          kind: "reorder",
          ticketExternalIds: ["1", "3"],
        },
        attemptCount: 0,
        lastErrorCode: null,
      }),
    });
    expect(remove).not.toHaveBeenCalledWith({ where: { id: "order-1" } });
  });
});

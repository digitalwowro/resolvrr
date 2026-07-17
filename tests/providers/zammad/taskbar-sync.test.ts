import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext, rawTicket } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;
    constructor(reason: string) { super(reason); this.reason = reason; }
  },
}));

const request = vi.mocked(safeProviderJson);
const response = (data: unknown) => ({ status: 200, headers: new Headers(), data });
const ticketTask = (id: number, prio = id, active = false) => ({
  id: id + 100,
  key: `Ticket-${id}`,
  callback: "TicketZoom",
  params: { ticket_id: id },
  prio,
  active,
  updated_at: "2026-07-15T10:00:00.000Z",
});

describe("Zammad ticket taskbar synchronization", () => {
  afterEach(() => vi.clearAllMocks());

  it("exposes only ordered ticket taskbar items through provider-neutral data", async () => {
    request.mockResolvedValueOnce(response([
      ticketTask(9, 20, true),
      { ...ticketTask(1, 10), key: "User-1", callback: "UserZoom", params: { user_id: 1 } },
      ticketTask(7, 5),
    ]));

    const result = await zammadProviderPlugin.readTicketTaskbar?.(providerContext());

    expect(result?.items.map((item) => item.ticketExternalId)).toEqual(["7", "9"]);
    expect(result?.items[1]).toMatchObject({ active: true, position: 1 });
    expect(JSON.stringify(result)).not.toContain("TicketZoom");
  });

  it("fails closed when a ticket taskbar record violates the pinned contract", async () => {
    request.mockResolvedValueOnce(response([
      { ...ticketTask(7), params: { ticket_id: 8 } },
    ]));

    await expect(
      zammadProviderPlugin.readTicketTaskbar?.(providerContext()),
    ).rejects.toMatchObject({
      kind: "provider-data-mismatch",
      diagnosticCode: "taskbar-contract-mismatch",
    });
  });

  it("fails closed when the pinned active-state field is unavailable", async () => {
    const withoutActive: Record<string, unknown> = { ...ticketTask(7) };
    delete withoutActive.active;
    request.mockResolvedValueOnce(response([withoutActive]));

    await expect(
      zammadProviderPlugin.readTicketTaskbar?.(providerContext()),
    ).rejects.toMatchObject({
      kind: "provider-data-mismatch",
      diagnosticCode: "taskbar-contract-mismatch",
    });
  });

  it("fails closed when the taskbar contains duplicate ticket tasks", async () => {
    request.mockResolvedValueOnce(response([ticketTask(7), { ...ticketTask(7), id: 999 }]));
    await expect(
      zammadProviderPlugin.readTicketTaskbar?.(providerContext()),
    ).rejects.toMatchObject({ diagnosticCode: "taskbar-contract-duplicate-ticket" });
  });

  it("marks active selection unreliable when multiple ticket tasks are active", async () => {
    request.mockResolvedValueOnce(response([
      ticketTask(7, 10, true),
      ticketTask(9, 20, true),
    ]));

    await expect(
      zammadProviderPlugin.readTicketTaskbar?.(providerContext()),
    ).resolves.toMatchObject({ activeSelectionReliable: false });
  });

  it("does not trust a ticket selection while a non-ticket task is also active", async () => {
    request.mockResolvedValueOnce(response([
      ticketTask(7, 10, true),
      {
        ...ticketTask(1, 20, true),
        key: "User-1",
        callback: "UserZoom",
        params: { user_id: 1 },
      },
    ]));

    await expect(
      zammadProviderPlugin.readTicketTaskbar?.(providerContext()),
    ).resolves.toMatchObject({ activeSelectionReliable: false });
  });

  it("validates ticket access before creating an idempotent Zammad task", async () => {
    request
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response(rawTicket))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response([ticketTask(42)]));

    const result = await zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "open", ticketExternalId: "42" }],
    );

    expect(request).toHaveBeenNthCalledWith(
      2,
      "https://helpdesk.example.com/api/v1/tickets/42?expand=true&full=true",
      expect.any(Object),
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      "https://helpdesk.example.com/api/v1/taskbar",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"callback":"TicketZoom"'),
      }),
    );
    expect(result?.confirmedCommandIndexes).toEqual([0]);
    expect(result?.snapshot.items[0]?.ticketExternalId).toBe("42");
  });

  it("keeps a command retryable when Zammad does not confirm its result", async () => {
    request
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response(rawTicket))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response([]));

    await expect(zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "open", ticketExternalId: "42" }],
    )).rejects.toMatchObject({
      kind: "temporary-provider-failure",
      retryable: true,
      diagnosticCode: "taskbar-command-unconfirmed",
    });
  });

  it("does not issue a delete when the ticket task is already absent", async () => {
    request
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response([]));

    await zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "close", ticketExternalId: "42" }],
    );

    expect(request).toHaveBeenCalledTimes(2);
    expect(request.mock.calls.some(([, options]) => options?.method === "DELETE")).toBe(false);
  });

  it("reorders ticket priority slots without moving non-ticket tasks", async () => {
    const nonTicket = {
      ...ticketTask(1, 20), key: "User-1", callback: "UserZoom", params: { user_id: 1 },
    };
    request
      .mockResolvedValueOnce(response([ticketTask(4, 10), nonTicket, ticketTask(5, 30)]))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response([ticketTask(5, 10), nonTicket, ticketTask(4, 30)]));

    await zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "reorder", ticketExternalIds: ["5", "4"] }],
    );

    const writes = request.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(writes).toHaveLength(2);
    expect(writes.every(([url]) => !url.endsWith("/101"))).toBe(true);
  });

  it("does not confirm an order that references a ticket still absent remotely", async () => {
    request
      .mockResolvedValueOnce(response([ticketTask(4, 10)]))
      .mockResolvedValueOnce(response([ticketTask(4, 10)]));

    await expect(zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "reorder", ticketExternalIds: ["5", "4"] }],
    )).rejects.toMatchObject({
      kind: "temporary-provider-failure",
      diagnosticCode: "taskbar-command-unconfirmed",
    });
  });

  it("activates only ticket tasks and leaves non-ticket active state untouched", async () => {
    const nonTicket = {
      ...ticketTask(1, 20, true), key: "User-1", callback: "UserZoom", params: { user_id: 1 },
    };
    request
      .mockResolvedValueOnce(response([ticketTask(4, 10), nonTicket, ticketTask(5, 30, true)]))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response([ticketTask(4, 10, true), nonTicket, ticketTask(5, 30)]));

    await zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "activate", ticketExternalId: "4" }],
    );

    const writes = request.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(writes).toHaveLength(2);
    expect(writes.every(([url]) => !url.endsWith("/101"))).toBe(true);
    expect(writes.map(([, options]) => options?.body)).toEqual([
      JSON.stringify({ active: false }),
      JSON.stringify({ active: true }),
    ]);
  });

  it("opens a remotely absent ticket before activating it", async () => {
    request
      .mockResolvedValueOnce(response([]))
      .mockResolvedValueOnce(response(rawTicket))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response([ticketTask(42)]))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response([ticketTask(42, 42, true)]));

    const result = await zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "activate", ticketExternalId: "42" }],
    );

    expect(request.mock.calls.some(([, options]) => options?.method === "POST"))
      .toBe(true);
    expect(request.mock.calls.some(([, options]) =>
      options?.method === "PUT" &&
      options.body === JSON.stringify({ active: true })
    )).toBe(true);
    expect(result?.snapshot.items[0]).toMatchObject({
      active: true,
      ticketExternalId: "42",
    });
  });

  it("deactivates active ticket tasks without changing non-ticket tasks", async () => {
    const nonTicket = {
      ...ticketTask(1, 20, true), key: "User-1", callback: "UserZoom", params: { user_id: 1 },
    };
    request
      .mockResolvedValueOnce(response([ticketTask(4, 10), nonTicket, ticketTask(5, 30, true)]))
      .mockResolvedValueOnce(response({}))
      .mockResolvedValueOnce(response([ticketTask(4, 10), nonTicket, ticketTask(5, 30)]));

    await zammadProviderPlugin.syncTicketTaskbar?.(
      providerContext(),
      [{ kind: "deactivate" }],
    );

    const writes = request.mock.calls.filter(([, options]) => options?.method === "PUT");
    expect(writes).toHaveLength(1);
    expect(writes[0]?.[0]).toBe("https://helpdesk.example.com/api/v1/taskbar/105");
    expect(writes[0]?.[1]?.body).toBe(JSON.stringify({ active: false }));
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;
    constructor(reason: string) { super(reason); this.reason = reason; }
  },
}));

const request = vi.mocked(safeProviderJson);
const response = (data: unknown) => ({
  status: 200,
  headers: new Headers(),
  data,
});
const ticketTask = (
  id: number,
  prio = id,
  app = "desktop",
) => ({
  app,
  id: id + 100,
  key: `Ticket-${id}`,
  callback: "TicketZoom",
  params: { ticket_id: id },
  prio,
});

describe("Zammad ticket-tab import", () => {
  afterEach(() => vi.clearAllMocks());

  it("returns unique desktop ticket tabs in Zammad order", async () => {
    request.mockResolvedValueOnce(response([
      ticketTask(9, 20),
      ticketTask(7, 5, "mobile"),
      { ...ticketTask(1, 10), key: "User-1", callback: "UserZoom" },
      ticketTask(4, 15),
      { ...ticketTask(4, 25), id: 999 },
    ]));

    const result = await zammadProviderPlugin.readTicketTabs?.(
      providerContext(),
    );

    expect(result).toEqual({
      contractVersion: "zammad-rest-desktop-ticket-tabs-v1",
      items: [
        { position: 0, ticketExternalId: "4" },
        { position: 1, ticketExternalId: "9" },
      ],
    });
    expect(JSON.stringify(result)).not.toContain("TicketZoom");
  });

  it("fails closed when a desktop ticket record violates the contract", async () => {
    request.mockResolvedValueOnce(response([
      { ...ticketTask(7), params: { ticket_id: 8 } },
    ]));

    await expect(
      zammadProviderPlugin.readTicketTabs?.(providerContext()),
    ).rejects.toMatchObject({
      kind: "provider-data-mismatch",
      diagnosticCode: "tab-import-contract-unavailable",
    });
  });

  it("performs exactly one read and never writes to the taskbar", async () => {
    request.mockResolvedValueOnce(response([ticketTask(7)]));

    await zammadProviderPlugin.readTicketTabs?.(providerContext());

    expect(request).toHaveBeenCalledTimes(1);
    expect(request).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/taskbar",
      expect.not.objectContaining({ method: expect.any(String) }),
    );
  });
});

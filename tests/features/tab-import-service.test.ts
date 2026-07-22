import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import { importWorkspaceTicketTabs } from "@/features/tab-import/service";
import {
  loadTicketProviderContextForConnection,
} from "@/features/tickets/connection-context";
import type { ProviderRegistry } from "@/providers";

vi.mock("@/features/tickets/connection-context", () => ({
  loadTicketProviderContextForConnection: vi.fn(),
  readUnavailableForProviderError: vi.fn(() => ({
    status: "unavailable",
    reason: "provider-temporary-failure",
    retryable: true,
  })),
}));

const context = {
  connection: {
    id: "connection-1",
    workspaceId: "workspace-1",
    identityVersion: "identity-1",
    providerKey: "provider",
    displayName: "Helpdesk",
    baseUrl: "https://helpdesk.example.com",
    status: "active" as const,
  },
  credentialScheme: "basic-auth",
  credentialPayload: {},
  requestSecurity: { validatedAddresses: ["93.184.216.34"] },
};

function repository() {
  return {} as HelpdeskConnectionsRepository;
}

describe("workspace ticket-tab import service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  it("passes the expected identity into the owned connection boundary", async () => {
    vi.mocked(loadTicketProviderContextForConnection).mockResolvedValue({
      status: "unavailable",
      reason: "no-active-connection",
      retryable: false,
    });
    const result = await importWorkspaceTicketTabs(
      repository(),
      {} as ProviderRegistry,
      "encryption-key",
      "user-1",
      "connection-1",
      "identity-1",
    );

    expect(result).toEqual({
      status: "unavailable",
      reason: "no-active-connection",
      retryable: false,
    });
    expect(loadTicketProviderContextForConnection).toHaveBeenCalledWith(
      expect.anything(),
      {},
      "encryption-key",
      "user-1",
      "connection-1",
      "lookup",
      "identity-1",
    );
  });

  it("reads ordered tabs through the owned connection without mutation", async () => {
    const readTicketTabs = vi.fn().mockResolvedValue({
      ticketExternalIds: ["1", "2"],
    });
    vi.mocked(loadTicketProviderContextForConnection).mockResolvedValue({
      status: "available",
      value: {
        context,
        plugin: {
          capabilities: ["ticket-tabs:import"],
          readTicketTabs,
        },
      },
    } as never);

    const result = await importWorkspaceTicketTabs(
      repository(),
      {} as ProviderRegistry,
      "encryption-key",
      "user-1",
      "connection-1",
      "identity-1",
    );

    expect(loadTicketProviderContextForConnection).toHaveBeenCalledWith(
      expect.anything(),
      {},
      "encryption-key",
      "user-1",
      "connection-1",
      "lookup",
      "identity-1",
    );
    expect(readTicketTabs).toHaveBeenCalledWith(context);
    expect(result).toEqual({
      status: "available",
      ticketExternalIds: ["1", "2"],
    });
  });

  it("disables import safely for an incompatible taskbar response", async () => {
    vi.mocked(loadTicketProviderContextForConnection).mockResolvedValue({
      status: "available",
      value: {
        context,
        plugin: {
          capabilities: ["ticket-tabs:import"],
          readTicketTabs: vi.fn().mockRejectedValue(new ProviderError(
            "provider-data-mismatch",
            "Mismatch",
            false,
            undefined,
            "tab-import-contract-unavailable",
          )),
        },
      },
    } as never);

    await expect(importWorkspaceTicketTabs(
      repository(),
      {} as ProviderRegistry,
      "encryption-key",
      "user-1",
      "connection-1",
      "identity-1",
    )).resolves.toEqual({
      status: "unavailable",
      reason: "tab-import-incompatible",
      retryable: false,
    });
  });
});

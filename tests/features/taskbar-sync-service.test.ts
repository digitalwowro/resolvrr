import { beforeEach, describe, expect, it, vi } from "vitest";
import type { HelpdeskConnectionsRepository } from "@/features/helpdesk-connections/repository";
import type { ProviderRegistry } from "@/providers";
import {
  loadTicketProviderContextForConnection,
} from "@/features/tickets/connection-context";
import {
  completeTaskbarSync,
  dueTaskbarOperations,
  enqueueTaskbarOperation,
  ensureTaskbarState,
  pendingTaskbarOperations,
  satisfiedTaskbarOperationIds,
} from "@/data/taskbar-sync-repository";
import { withTaskbarSyncLock } from "@/data/taskbar-sync-lock";
import { synchronizeWorkspaceTaskbar } from "@/features/taskbar-sync/service";

vi.mock("@/features/tickets/connection-context", () => ({
  loadTicketProviderContextForConnection: vi.fn(),
  readUnavailableForProviderError: vi.fn(() => ({
    status: "unavailable",
    reason: "provider-temporary-failure",
    retryable: true,
  })),
}));

vi.mock("@/data/taskbar-sync-lock", () => ({
  withTaskbarSyncLock: vi.fn(async (
    _connectionId: string,
    operation: (transaction: object) => Promise<unknown>,
  ) => operation({
    $queryRaw: vi.fn().mockResolvedValue([{ id: "connection-1" }]),
  })),
}));

vi.mock("@/data/taskbar-sync-repository", () => ({
  completeTaskbarSync: vi.fn(),
  dueTaskbarOperations: vi.fn(),
  enqueueTaskbarOperation: vi.fn(),
  ensureTaskbarState: vi.fn(),
  failTaskbarSync: vi.fn(),
  markTaskbarIncompatible: vi.fn(),
  pendingTaskbarOperations: vi.fn(),
  satisfiedTaskbarOperationIds: vi.fn(),
}));

describe("workspace taskbar synchronization service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(ensureTaskbarState).mockResolvedValue({
      id: "state-1",
      compatibility: "SUPPORTED",
      initializedAt: new Date("2026-07-17T00:00:00.000Z"),
    });
    vi.mocked(dueTaskbarOperations).mockResolvedValue([]);
    vi.mocked(pendingTaskbarOperations).mockResolvedValue([]);
    vi.mocked(satisfiedTaskbarOperationIds).mockResolvedValue([]);
    vi.mocked(completeTaskbarSync).mockResolvedValue();
  });

  it("rejects a stale identity before creating state or calling the provider", async () => {
    const repository = {
      findForUser: vi.fn().mockResolvedValue({
        id: "connection-1",
        identityVersion: "identity-2",
      }),
    } as unknown as HelpdeskConnectionsRepository;

    const result = await synchronizeWorkspaceTaskbar(
      repository,
      {} as ProviderRegistry,
      "encryption-key",
      "user-1",
      "connection-1",
      "identity-1",
      { kind: "activate", ticketExternalId: "42" },
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "no-active-connection",
    });
    expect(ensureTaskbarState).not.toHaveBeenCalled();
    expect(loadTicketProviderContextForConnection).not.toHaveBeenCalled();
  });

  it("rejects an identity changed while provider context was loading", async () => {
    const repository = {
      findForUser: vi.fn().mockResolvedValue({
        id: "connection-1",
        identityVersion: "identity-1",
      }),
    } as unknown as HelpdeskConnectionsRepository;
    vi.mocked(loadTicketProviderContextForConnection).mockResolvedValue({
      status: "unavailable",
      reason: "provider-auth-failed",
      retryable: false,
    });
    vi.mocked(withTaskbarSyncLock).mockImplementationOnce(async (
      _connectionId,
      operation,
    ) => operation({
      $queryRaw: vi.fn().mockResolvedValue([]),
    } as never));

    const result = await synchronizeWorkspaceTaskbar(
      repository,
      {} as ProviderRegistry,
      "encryption-key",
      "user-1",
      "connection-1",
      "identity-1",
      { kind: "activate", ticketExternalId: "42" },
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "no-active-connection",
    });
    expect(ensureTaskbarState).not.toHaveBeenCalled();
    expect(enqueueTaskbarOperation).not.toHaveBeenCalled();
  });

  it("uses the originating personal connection and preserves unreliable active state", async () => {
    const repository = {
      findForUser: vi.fn().mockResolvedValue({
        id: "connection-1",
        identityVersion: "identity-1",
      }),
    } as unknown as HelpdeskConnectionsRepository;
    const readTicketTaskbar = vi.fn().mockResolvedValue({
      activeSelectionReliable: false,
      contractVersion: "contract-1",
      items: [
        {
          active: true,
          position: 0,
          ticketExternalId: "1",
          updatedAt: new Date("2026-07-17T00:00:00.000Z"),
        },
        {
          active: true,
          position: 1,
          ticketExternalId: "2",
          updatedAt: new Date("2026-07-17T00:00:00.000Z"),
        },
      ],
    });
    const plugin = {
      capabilities: ["ticket-taskbar:sync"],
      readTicketTaskbar,
      syncTicketTaskbar: vi.fn(),
    };
    vi.mocked(loadTicketProviderContextForConnection).mockResolvedValue({
      status: "available",
      value: {
        plugin,
        context: {
          connection: {
            id: "connection-1",
            workspaceId: "workspace-1",
            identityVersion: "identity-1",
            providerKey: "provider",
            displayName: "Helpdesk",
            baseUrl: "https://helpdesk.example.com",
            status: "active",
          },
          credentialScheme: "basic-auth",
          credentialPayload: {},
          requestSecurity: { validatedAddresses: ["93.184.216.34"] },
        },
      },
    } as never);

    const result = await synchronizeWorkspaceTaskbar(
      repository,
      {} as ProviderRegistry,
      "encryption-key",
      "user-1",
      "connection-1",
      "identity-1",
      { kind: "reconcile" },
    );

    expect(loadTicketProviderContextForConnection).toHaveBeenCalledWith(
      repository,
      {},
      "encryption-key",
      "user-1",
      "connection-1",
      "mutation",
    );
    expect(withTaskbarSyncLock).toHaveBeenCalledWith(
      "connection-1",
      expect.any(Function),
    );
    expect(result).toMatchObject({
      status: "available",
      activeSelectionReliable: false,
      ticketExternalIds: ["1", "2"],
    });
    expect(result).not.toHaveProperty("activeTicketExternalId");
  });

  it("persists explicit intent before provider authentication is available", async () => {
    const repository = {
      findForUser: vi.fn().mockResolvedValue({
        id: "connection-1",
        identityVersion: "identity-1",
      }),
    } as unknown as HelpdeskConnectionsRepository;
    vi.mocked(pendingTaskbarOperations).mockResolvedValue([
      { kind: "activate", ticketExternalId: "42" },
    ]);
    vi.mocked(loadTicketProviderContextForConnection).mockResolvedValue({
      status: "unavailable",
      reason: "provider-auth-failed",
      retryable: false,
    });

    const result = await synchronizeWorkspaceTaskbar(
      repository,
      {} as ProviderRegistry,
      "encryption-key",
      "user-1",
      "connection-1",
      "identity-1",
      { kind: "activate", ticketExternalId: "42" },
    );

    expect(enqueueTaskbarOperation).toHaveBeenCalledWith(
      expect.any(Object),
      "state-1",
      { kind: "activate", ticketExternalId: "42" },
    );
    expect(result).toMatchObject({
      status: "unavailable",
      reason: "provider-auth-failed",
      activeNotSynchronized: true,
      pendingActiveTicketExternalId: "42",
      unsynchronizedTicketExternalIds: ["42"],
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import {
  loadWorkspaceTicketDetail,
  loadWorkspaceTicketList,
} from "@/features/tickets";
import {
  connection,
  encryptionKey,
  mockValidatedBaseUrl,
  provider,
  repository,
} from "./ticket-service-test-helpers";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

describe("ticket read service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("returns an unavailable state when no active connection exists", async () => {
    const result = await loadWorkspaceTicketList(
      repository({ activeConnectionId: null }),
      createProviderRegistry([provider()]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "no-active-connection",
    });
  });

  it.each([
    ["inactive-connection", connection({ status: "disconnected" })],
    ["missing-credentials", connection({ credential: null })],
    ["unknown-provider", connection({ providerKey: "missing-provider" })],
  ])("returns %s before calling the provider", async (reason, storedConnection) => {
    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: storedConnection,
      }),
      createProviderRegistry([provider()]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({ status: "unavailable", reason });
  });

  it("passes decrypted credentials and validated addresses to provider reads", async () => {
    const consoleInfo = vi
      .spyOn(console, "info")
      .mockImplementation(() => undefined);
    const listTickets = vi.fn(provider().listTickets);

    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ listTickets })]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({
      status: "available",
      connectionName: "Support",
      metadataMutationCapabilities: { state: false, priority: false },
    });
    expect(listTickets).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "secret" },
        requestSecurity: { validatedAddresses: ["93.184.216.34"] },
      }),
      expect.objectContaining({ pageSize: 25 }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "active-connection-lookup",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "base-url-security-revalidation",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "credential-decrypt",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
    expect(consoleInfo).toHaveBeenCalledWith(
      "Ticket read timing",
      expect.objectContaining({
        operation: "list",
        phase: "total-list-load",
        providerKey: "test-provider",
        status: "ok",
      }),
    );
  });

  it("maps unsupported capabilities to an unavailable state", async () => {
    const result = await loadWorkspaceTicketDetail(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider({ capabilities: ["ticket:list"] })]),
      encryptionKey,
      "user-1",
      "ticket-1",
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "unsupported-capability",
    });
  });

  it.each([
    [
      new ProviderError("credential-auth-failure", "auth rejected"),
      "provider-auth-failed",
    ],
    [new ProviderError("permission-denied", "denied"), "provider-permission-denied"],
    [
      new ProviderError("rate-limited", "rate limited", true),
      "provider-rate-limited",
    ],
    [
      new ProviderError("temporary-provider-failure", "network", true),
      "provider-temporary-failure",
    ],
    [
      new ProviderError("provider-data-mismatch", "unexpected"),
      "provider-unexpected-response",
    ],
  ])("maps provider failure %s to %s", async (error, reason) => {
    const result = await loadWorkspaceTicketList(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          listTickets: async () => {
            throw error;
          },
        }),
      ]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({ status: "unavailable", reason });
  });

});

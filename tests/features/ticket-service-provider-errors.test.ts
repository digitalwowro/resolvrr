import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import { loadWorkspaceTicketList } from "@/features/tickets";
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

describe("ticket service provider error mapping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
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

import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProviderRegistry } from "@/providers";
import { loadWorkspaceTicketDetail } from "@/features/tickets";
import {
  encryptionKey,
  mockedValidateProviderBaseUrl,
  provider,
  repository,
} from "./ticket-service-test-helpers";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

describe("personal helpdesk connection boundary", () => {
  beforeEach(() => vi.clearAllMocks());

  it("fails before URL validation, cache access, or provider reads", async () => {
    const getTicketDetail = vi.fn(provider().getTicketDetail);
    const cacheRepository = {
      enabled: true,
      invalidateConnection: vi.fn(),
      invalidateTicketDetail: vi.fn(),
      readTicketDetail: vi.fn(),
      storeTicketDetail: vi.fn(),
    };
    const result = await loadWorkspaceTicketDetail(
      repository({ activeConnectionId: "workspace-1", connection: null }),
      createProviderRegistry([provider({ getTicketDetail })]),
      encryptionKey,
      "user-2",
      "ticket-1",
      cacheRepository,
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "personal-connection-required",
    });
    expect(mockedValidateProviderBaseUrl).not.toHaveBeenCalled();
    expect(cacheRepository.readTicketDetail).not.toHaveBeenCalled();
    expect(cacheRepository.storeTicketDetail).not.toHaveBeenCalled();
    expect(getTicketDetail).not.toHaveBeenCalled();
  });
});

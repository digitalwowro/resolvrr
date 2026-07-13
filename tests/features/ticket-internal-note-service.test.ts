import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import {
  addWorkspaceTicketCustomerReply,
  addWorkspaceTicketInternalNote,
} from "@/features/tickets";
import {
  connection,
  encryptionKey,
  mockValidatedBaseUrl,
  provider,
  replyInput,
  repository,
} from "./ticket-service-test-helpers";

vi.mock("@/security/base-url-validation", () => ({
  validateProviderBaseUrl: vi.fn(),
}));

describe("ticket internal note service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("adds an internal note and verifies the refreshed ticket detail", async () => {
    const addTicketInternalNote = vi.fn().mockResolvedValue(undefined);
    const getTicketDetail = vi.fn(provider().getTicketDetail);

    const result = await addWorkspaceTicketInternalNote(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          addTicketInternalNote,
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:add-internal-note",
          ],
          getTicketDetail,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { body: "  Checked the logs.  " },
    );

    expect(result).toEqual({ status: "saved" });
    expect(addTicketInternalNote).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "secret" },
        requestSecurity: { validatedAddresses: ["93.184.216.34"] },
      }),
      "ticket-1",
      { body: "Checked the logs." },
    );
    expect(getTicketDetail).toHaveBeenCalledWith(expect.any(Object), "ticket-1");
  });

  it("rejects unsupported providers before calling the provider note method", async () => {
    const addTicketInternalNote = vi.fn().mockResolvedValue(undefined);

    const result = await addWorkspaceTicketInternalNote(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          addTicketInternalNote,
          capabilities: ["ticket:list", "ticket:detail"],
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { body: "Checked the logs." },
    );

    expect(result).toEqual({
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    });
    expect(addTicketInternalNote).not.toHaveBeenCalled();
  });

  it("reports saved-refresh-failed when the post-note detail refresh fails", async () => {
    const result = await addWorkspaceTicketInternalNote(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          addTicketInternalNote: async () => undefined,
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:add-internal-note",
          ],
          getTicketDetail: async () => {
            throw new ProviderError("temporary-provider-failure", "network", true);
          },
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { body: "Checked the logs." },
    );

    expect(result).toEqual({
      status: "saved-refresh-failed",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });
});

describe("ticket customer reply service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("sends a customer reply and verifies the refreshed ticket detail", async () => {
    const addTicketCustomerReply = vi.fn().mockResolvedValue(undefined);
    const getTicketDetail = vi.fn(provider().getTicketDetail);

    const result = await addWorkspaceTicketCustomerReply(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          addTicketCustomerReply,
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:add-customer-reply",
          ],
          getTicketDetail,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      replyInput("  Thanks for the report.  "),
    );

    expect(result).toEqual({ status: "saved" });
    expect(addTicketCustomerReply).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "secret" },
        requestSecurity: { validatedAddresses: ["93.184.216.34"] },
      }),
      "ticket-1",
      replyInput("Thanks for the report."),
    );
    expect(getTicketDetail).toHaveBeenCalledWith(expect.any(Object), "ticket-1");
  });

  it("rejects unsupported providers before calling the reply method", async () => {
    const addTicketCustomerReply = vi.fn().mockResolvedValue(undefined);

    const result = await addWorkspaceTicketCustomerReply(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          addTicketCustomerReply,
          capabilities: ["ticket:list", "ticket:detail"],
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      replyInput("Thanks for the report."),
    );

    expect(result).toEqual({
      status: "failed",
      reason: "unsupported-capability",
      retryable: false,
    });
    expect(addTicketCustomerReply).not.toHaveBeenCalled();
  });

  it("reports saved-refresh-failed when the post-reply detail refresh fails", async () => {
    const result = await addWorkspaceTicketCustomerReply(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          addTicketCustomerReply: async () => undefined,
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:add-customer-reply",
          ],
          getTicketDetail: async () => {
            throw new ProviderError("temporary-provider-failure", "network", true);
          },
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      replyInput("Thanks for the report."),
    );

    expect(result).toEqual({
      status: "saved-refresh-failed",
      reason: "provider-temporary-failure",
      retryable: true,
    });
  });
});

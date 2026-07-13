import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import {
  addWorkspaceTicketCustomerReply,
  addWorkspaceTicketInternalNote,
} from "@/features/tickets";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
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

function communicationAuditCalls(info: { mock: { calls: unknown[][] } }) {
  return info.mock.calls.filter(
    (call) => call[0] === "Ticket communication audit",
  );
}

describe("ticket communication audit logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateProviderBaseUrl).mockReset();
    mockValidatedBaseUrl();
  });

  it("records only safe communication metadata for customer reply saves", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

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
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-provider-id-contains-customer-text",
      replyInput("raw reply body should never be logged"),
    );

    expect(result).toEqual({ status: "saved" });
    expect(communicationAuditCalls(info)).toEqual([
      [
        "Ticket communication audit",
        {
          connectionId: "connection-1",
          kind: "customer-reply",
          providerKey: "test-provider",
          status: "saved",
        },
      ],
    ]);
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "raw reply body should never be logged",
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "ticket-provider-id-contains-customer-text",
    );
  });

  it("records uncertain internal note sends without logging note bodies", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

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
      { body: "raw internal note body should never be logged" },
    );

    expect(result).toEqual({
      status: "saved-refresh-failed",
      reason: "provider-temporary-failure",
      retryable: true,
    });
    expect(communicationAuditCalls(info)).toEqual([
      [
        "Ticket communication audit",
        {
          connectionId: "connection-1",
          kind: "internal-note",
          providerKey: "test-provider",
          reason: "provider-temporary-failure",
          retryable: true,
          status: "saved-refresh-failed",
        },
      ],
    ]);
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "raw internal note body should never be logged",
    );
  });

  it("does not log provider error messages or response bodies for failed sends", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await addWorkspaceTicketCustomerReply(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          addTicketCustomerReply: async () => {
            throw new ProviderError(
              "provider-data-mismatch",
              "Provider response body contains raw customer reply",
            );
          },
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:add-customer-reply",
          ],
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      replyInput("raw failed reply body should never be logged"),
    );

    expect(result).toEqual({
      status: "failed",
      reason: "provider-unexpected-response",
      retryable: false,
    });
    expect(communicationAuditCalls(info)).toEqual([
      [
        "Ticket communication audit",
        {
          connectionId: "connection-1",
          kind: "customer-reply",
          providerKey: "test-provider",
          reason: "provider-unexpected-response",
          retryable: false,
          status: "failed",
        },
      ],
    ]);
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "Provider response body contains raw customer reply",
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "raw failed reply body should never be logged",
    );
  });
});

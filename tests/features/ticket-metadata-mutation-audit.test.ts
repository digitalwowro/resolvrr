import { beforeEach, describe, expect, it, vi } from "vitest";
import { ProviderError } from "@/core/providers";
import { createProviderRegistry } from "@/providers";
import { updateWorkspaceTicketMetadata } from "@/features/tickets";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
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

function auditCalls(info: { mock: { calls: unknown[][] } }) {
  return info.mock.calls.filter(
    (call) => call[0] === "Ticket metadata mutation audit",
  );
}

describe("ticket metadata mutation audit logs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(validateProviderBaseUrl).mockReset();
    mockValidatedBaseUrl();
  });

  it("records only safe mutation metadata for saved-refresh-failed outcomes", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await updateWorkspaceTicketMetadata(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: [
            "ticket:list",
            "ticket:detail",
            "ticket:update-state",
            "ticket:update-tags",
            "ticket:update-links",
            "ticket:update-subscription",
          ],
          getTicketDetail: async () => {
            throw new ProviderError("temporary-provider-failure", "network", true);
          },
          updateTicketMetadata: async () => undefined,
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-provider-id-contains-customer-text",
      {
        linkAddExternalId: "linked-ticket-secret",
        pendingUntil: new Date("2099-01-02T03:04:00.000Z"),
        state: "pending_close",
        subscriptionFollowing: false,
        tags: ["raw customer note should not be logged"],
      },
    );

    expect(result).toMatchObject({ status: "saved-refresh-failed" });
    expect(auditCalls(info)).toEqual([
      [
        "Ticket metadata mutation audit",
        {
          connectionId: "connection-1",
          fieldCount: 4,
          fields: "state,tags,links,subscription",
          pendingDateIncluded: true,
          providerKey: "test-provider",
          reason: "provider-temporary-failure",
          retryable: true,
          status: "saved-refresh-failed",
        },
      ],
    ]);
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "raw customer note should not be logged",
    );
    expect(JSON.stringify(info.mock.calls)).not.toContain("linked-ticket-secret");
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "ticket-provider-id-contains-customer-text",
    );
  });

  it("does not log provider error messages or response bodies for failed writes", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);

    const result = await updateWorkspaceTicketMetadata(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["ticket:list", "ticket:detail", "ticket:update-state"],
          updateTicketMetadata: async () => {
            throw new ProviderError(
              "validation-failure",
              "Provider response body contains raw customer content",
            );
          },
        }),
      ]),
      encryptionKey,
      "user-1",
      "ticket-1",
      { state: "new" },
    );

    expect(result).toEqual({
      status: "failed",
      reason: "unavailable-transition",
      retryable: false,
    });
    expect(auditCalls(info)).toEqual([
      [
        "Ticket metadata mutation audit",
        {
          connectionId: "connection-1",
          fieldCount: 1,
          fields: "state",
          pendingDateIncluded: false,
          providerKey: "test-provider",
          reason: "unavailable-transition",
          retryable: false,
          status: "failed",
        },
      ],
    ]);
    expect(JSON.stringify(info.mock.calls)).not.toContain(
      "Provider response body contains raw customer content",
    );
  });
});

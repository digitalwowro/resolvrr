import { beforeEach, describe, expect, it, vi } from "vitest";
import { createProviderRegistry } from "@/providers";
import {
  loadWorkspaceNotifications,
  markWorkspaceNotificationsRead,
} from "@/features/notifications/service";
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

describe("workspace notification service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockValidatedBaseUrl();
  });

  it("returns unavailable when the active provider cannot list notifications", async () => {
    const result = await loadWorkspaceNotifications(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([provider()]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({
      status: "unavailable",
      reason: "unsupported-capability",
    });
  });

  it("loads notifications through provider-neutral dispatch", async () => {
    const listNotifications = vi.fn(async () => [
      {
        id: "notification-1",
        read: false,
        type: "ticket-updated" as const,
        ticketExternalId: "ticket-1",
        ticketNumber: "1001",
        ticketTitle: "Cannot log in",
        createdAt: new Date("2026-06-03T08:00:00.000Z"),
        actor: "Agent Smith",
      },
    ]);

    const result = await loadWorkspaceNotifications(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["notifications:list"],
          listNotifications,
        }),
      ]),
      encryptionKey,
      "user-1",
    );

    expect(result).toMatchObject({
      status: "available",
      notifications: [
        {
          id: "notification-1",
          read: false,
          type: "ticket-updated",
          ticketExternalId: "ticket-1",
          ticketNumber: "1001",
          ticketTitle: "Cannot log in",
          actor: "Agent Smith",
        },
      ],
    });
    expect(listNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        credentialPayload: { username: "agent", password: "secret" },
        requestSecurity: { validatedAddresses: ["93.184.216.34"] },
      }),
    );
  });

  it("marks individual and all notifications read through provider-neutral dispatch", async () => {
    const markNotificationsRead = vi.fn(async () => undefined);

    await markWorkspaceNotificationsRead(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["notifications:mark-read"],
          markNotificationsRead,
        }),
      ]),
      encryptionKey,
      "user-1",
      { notificationIds: ["notification-1", "notification-1", "notification-2"] },
    );
    await markWorkspaceNotificationsRead(
      repository({
        activeConnectionId: "connection-1",
        connection: connection(),
      }),
      createProviderRegistry([
        provider({
          capabilities: ["notifications:mark-read"],
          markNotificationsRead,
        }),
      ]),
      encryptionKey,
      "user-1",
      { all: true },
    );

    expect(markNotificationsRead).toHaveBeenNthCalledWith(
      1,
      expect.any(Object),
      { notificationIds: ["notification-1", "notification-2"] },
    );
    expect(markNotificationsRead).toHaveBeenNthCalledWith(
      2,
      expect.any(Object),
      { all: true },
    );
  });
});

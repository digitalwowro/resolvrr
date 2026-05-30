import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTicketMetadataAction } from "@/features/tickets/actions";
import { updateWorkspaceTicketMetadata } from "@/features/tickets/service";
import { revalidatePath } from "next/cache";

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/auth/current-user", () => ({
  requireCurrentUser: vi.fn(async () => ({ id: "user-1" })),
}));

vi.mock("@/config/env", () => ({
  env: { APP_ENCRYPTION_KEY: "0123456789abcdef0123456789abcdef" },
}));

vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {},
}));

vi.mock("@/providers", () => ({
  providerRegistry: {},
}));

vi.mock("@/features/tickets/service", () => ({
  updateWorkspaceTicketMetadata: vi.fn(),
}));

const mockedUpdateWorkspaceTicketMetadata = vi.mocked(updateWorkspaceTicketMetadata);
const mockedRevalidatePath = vi.mocked(revalidatePath);

function priorityUpdatePayload() {
  return {
    metadata: { priority: "high" as const },
    ticketExternalId: "ticket-1",
  };
}

describe("updateTicketMetadataAction revalidation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each(["saved", "saved-refresh-failed"] as const)(
    "invalidates the workspace after %s metadata writes",
    async (status) => {
      mockedUpdateWorkspaceTicketMetadata.mockResolvedValueOnce(
        status === "saved"
          ? { status: "saved" }
          : {
              status: "saved-refresh-failed",
              reason: "provider-temporary-failure",
              retryable: true,
            },
      );

      await updateTicketMetadataAction(priorityUpdatePayload());

      expect(mockedRevalidatePath).toHaveBeenCalledWith("/workspace");
    },
  );

  it("keeps the saved-refresh-failed warning message", async () => {
    mockedUpdateWorkspaceTicketMetadata.mockResolvedValueOnce({
      status: "saved-refresh-failed",
      reason: "provider-temporary-failure",
      retryable: true,
    });

    const result = await updateTicketMetadataAction(priorityUpdatePayload());

    expect(result).toEqual({
      status: "saved-refresh-failed",
      field: "priority",
      message:
        "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
    });
  });

  it("passes one provider-neutral metadata input to the mutation service", async () => {
    mockedUpdateWorkspaceTicketMetadata.mockResolvedValueOnce({
      status: "saved",
    });

    await updateTicketMetadataAction({
      metadata: {
        pendingUntil: "2099-01-02T08:00:00.000Z",
        priority: "high",
        state: "pending_close",
      },
      ticketExternalId: "ticket-1",
    });

    expect(mockedUpdateWorkspaceTicketMetadata).toHaveBeenCalledOnce();
    expect(mockedUpdateWorkspaceTicketMetadata.mock.calls[0]).toEqual([
      {},
      {},
      "0123456789abcdef0123456789abcdef",
      "user-1",
      "ticket-1",
      {
        pendingUntil: new Date("2099-01-02T08:00:00.000Z"),
        priority: "high",
        state: "pending_close",
      },
    ]);
  });
});

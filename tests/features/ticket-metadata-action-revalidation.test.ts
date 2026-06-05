import { beforeEach, describe, expect, it, vi } from "vitest";
import { updateTicketMetadataAction } from "@/features/tickets/actions";
import {
  addWorkspaceTicketCustomerReply,
  addWorkspaceTicketInternalNote,
} from "@/features/tickets/communication-service";
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

vi.mock("@/data/ai-summary-cache-repository", () => ({
  prismaAiSummaryCacheRepository: { enabled: true },
}));

vi.mock("@/data/ticket-detail-cache-repository", () => ({
  prismaTicketDetailCacheRepository: { enabled: true },
}));

vi.mock("@/providers", () => ({
  providerRegistry: {},
}));

vi.mock("@/features/tickets/service", () => ({
  updateWorkspaceTicketMetadata: vi.fn(),
}));

vi.mock("@/features/tickets/communication-service", () => ({
  addWorkspaceTicketCustomerReply: vi.fn(),
  addWorkspaceTicketInternalNote: vi.fn(),
}));

const mockedUpdateWorkspaceTicketMetadata = vi.mocked(updateWorkspaceTicketMetadata);
const mockedAddWorkspaceTicketCustomerReply = vi.mocked(
  addWorkspaceTicketCustomerReply,
);
const mockedAddWorkspaceTicketInternalNote = vi.mocked(
  addWorkspaceTicketInternalNote,
);
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
      { enabled: true },
      { enabled: true },
    ]);
  });

  it("sends staged comment and reply bodies through the update action", async () => {
    mockedAddWorkspaceTicketInternalNote.mockResolvedValueOnce({
      status: "saved",
    });
    mockedAddWorkspaceTicketCustomerReply.mockResolvedValueOnce({
      status: "saved",
    });

    const result = await updateTicketMetadataAction({
      communication: {
        bodyFormat: "html",
        commentBody: "<p>Checked the logs.</p>",
        replyBody: "<p>Thanks for the report.</p>",
      },
      ticketExternalId: "ticket-1",
    });

    expect(result).toEqual({
      status: "saved",
      field: "communication",
      message: "Saved.",
    });
    expect(mockedUpdateWorkspaceTicketMetadata).not.toHaveBeenCalled();
    expect(mockedAddWorkspaceTicketInternalNote).toHaveBeenCalledWith(
      {},
      {},
      "0123456789abcdef0123456789abcdef",
      "user-1",
      "ticket-1",
      { body: "<p>Checked the logs.</p>", bodyFormat: "html" },
      { enabled: true },
      { enabled: true },
    );
    expect(mockedAddWorkspaceTicketCustomerReply).toHaveBeenCalledWith(
      {},
      {},
      "0123456789abcdef0123456789abcdef",
      "user-1",
      "ticket-1",
      { body: "<p>Thanks for the report.</p>", bodyFormat: "html" },
      { enabled: true },
      { enabled: true },
    );
    expect(mockedRevalidatePath).toHaveBeenCalledWith("/workspace");
  });
});

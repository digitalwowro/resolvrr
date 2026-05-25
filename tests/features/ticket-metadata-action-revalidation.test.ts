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

function priorityFormData() {
  const formData = new FormData();
  formData.set("ticketExternalId", "ticket-1");
  formData.set("priority", "high");
  return formData;
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

      await updateTicketMetadataAction(priorityFormData());

      expect(mockedRevalidatePath).toHaveBeenCalledWith("/workspace");
    },
  );

  it("keeps the saved-refresh-failed warning message", async () => {
    mockedUpdateWorkspaceTicketMetadata.mockResolvedValueOnce({
      status: "saved-refresh-failed",
      reason: "provider-temporary-failure",
      retryable: true,
    });

    const result = await updateTicketMetadataAction(priorityFormData());

    expect(result).toEqual({
      status: "saved-refresh-failed",
      field: "priority",
      message:
        "Saved, but the ticket could not be refreshed. Refresh the workspace to verify the latest value.",
    });
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/auth/current-user";
import { loadWorkspaceTicketAttachment } from "@/features/tickets/attachment-service";
import { GET } from "@/app/api/helpdesk-connections/[connectionId]/tickets/[ticketExternalId]/articles/[articleExternalId]/attachments/[attachmentExternalId]/route";

vi.mock("@/auth/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/config/env", () => ({ env: { APP_ENCRYPTION_KEY: "test-key" } }));
vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {},
}));
vi.mock("@/providers", () => ({ providerRegistry: {} }));
vi.mock("@/features/tickets/attachment-service", () => ({
  loadWorkspaceTicketAttachment: vi.fn(),
}));

const mockedCurrentUser = vi.mocked(getCurrentUser);
const mockedLoad = vi.mocked(loadWorkspaceTicketAttachment);
const params = Promise.resolve({
  articleExternalId: "500",
  attachmentExternalId: "503",
  connectionId: "connection-1",
  ticketExternalId: "42",
});

describe("ticket attachment route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires the signed-in user's personal connection", async () => {
    mockedCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request("https://resolvrr.test/download"), {
      params,
    });

    expect(response.status).toBe(401);
    expect(mockedLoad).not.toHaveBeenCalled();
  });

  it("returns private bytes with a safe download filename", async () => {
    mockedCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockedLoad.mockResolvedValue({
      attachment: {
        bytes: new Uint8Array([1, 2, 3, 4]),
        contentType: "application/pdf",
        fileName: 'Résumé "final".pdf',
      },
      status: "available",
    });

    const response = await GET(new Request("https://resolvrr.test/download"), {
      params,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toBe(
      "attachment; filename=\"R_sum_ _final_.pdf\"; filename*=UTF-8''R%C3%A9sum%C3%A9%20%22final%22.pdf",
    );
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(
      new Uint8Array([1, 2, 3, 4]),
    );
    expect(mockedLoad).toHaveBeenCalledWith(expect.objectContaining({
      connectionId: "connection-1",
      locator: {
        articleExternalId: "500",
        attachmentExternalId: "503",
        ticketExternalId: "42",
      },
      userId: "user-1",
    }));
  });

  it("does not expose unavailable provider resources", async () => {
    mockedCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockedLoad.mockResolvedValue({
      reason: "provider-unexpected-response",
      retryable: false,
      status: "unavailable",
    });

    const response = await GET(new Request("https://resolvrr.test/download"), {
      params,
    });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});

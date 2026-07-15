import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/auth/current-user";
import { loadWorkspaceTicketInlineImage } from "@/features/tickets/inline-image-service";
import { GET } from "@/app/api/helpdesk-connections/[connectionId]/tickets/[ticketExternalId]/articles/[articleExternalId]/inline-images/[attachmentExternalId]/route";

vi.mock("@/auth/current-user", () => ({ getCurrentUser: vi.fn() }));
vi.mock("@/config/env", () => ({ env: { APP_ENCRYPTION_KEY: "test-key" } }));
vi.mock("@/data/helpdesk-connections-repository", () => ({
  prismaHelpdeskConnectionsRepository: {},
}));
vi.mock("@/providers", () => ({ providerRegistry: {} }));
vi.mock("@/features/tickets/inline-image-service", () => ({
  loadWorkspaceTicketInlineImage: vi.fn(),
}));

const mockedCurrentUser = vi.mocked(getCurrentUser);
const mockedLoad = vi.mocked(loadWorkspaceTicketInlineImage);
const params = Promise.resolve({
  articleExternalId: "500",
  attachmentExternalId: "503",
  connectionId: "connection-1",
  ticketExternalId: "42",
});

describe("ticket inline image route", () => {
  beforeEach(() => vi.clearAllMocks());

  it("requires an authenticated workspace user", async () => {
    mockedCurrentUser.mockResolvedValue(null);

    const response = await GET(new Request("https://resolvrr.test/image"), { params });

    expect(response.status).toBe(401);
    expect(mockedLoad).not.toHaveBeenCalled();
  });

  it("returns private, type-safe provider image bytes", async () => {
    mockedCurrentUser.mockResolvedValue({ id: "user-1" } as never);
    mockedLoad.mockResolvedValue({
      image: {
        bytes: new Uint8Array([1, 2, 3, 4]),
        contentType: "image/png",
      },
      status: "available",
    });

    const response = await GET(new Request("https://resolvrr.test/image"), { params });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("content-type")).toBe("image/png");
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

    const response = await GET(new Request("https://resolvrr.test/image"), { params });

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("");
  });
});

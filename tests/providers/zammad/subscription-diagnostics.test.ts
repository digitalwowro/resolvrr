import { afterEach, describe, expect, it, vi } from "vitest";
import { readZammadSecondaryTicketData } from "@/providers/zammad/ticket-secondary";
import { safeProviderJson } from "@/security/provider-http";
import { providerContext, rawTicket } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;

    constructor(reason: string, message: string) {
      super(message);
      this.name = "ProviderJsonBodyError";
      this.reason = reason;
    }
  },
}));

const mockedSafeProviderJson = vi.mocked(safeProviderJson);

function providerResponse(data: unknown, status = 200) {
  return { status, headers: new Headers(), data };
}

function mockTagsAndLinks() {
  mockedSafeProviderJson
    .mockResolvedValueOnce(providerResponse({ tags: [] }))
    .mockResolvedValueOnce(providerResponse({ links: [] }));
}

describe("Zammad subscription diagnostics", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("logs and returns unsupported when /users/me fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTagsAndLinks();
    mockedSafeProviderJson.mockResolvedValueOnce(providerResponse({}, 403));

    const result = await readZammadSecondaryTicketData(
      providerContext(),
      rawTicket,
    );

    expect(result.subscription).toEqual({ supported: false, following: false });
    expect(warn).toHaveBeenCalledWith(
      "Zammad subscription secondary read unavailable",
      expect.objectContaining({
        endpoint: "users-me",
        issue: "request-failed",
        providerErrorKind: "provider-data-mismatch",
        statusClass: "4xx",
        statusCode: 403,
        upstreamProviderErrorKind: "permission-denied",
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("agent@example.com");
    expect(mockedSafeProviderJson).not.toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/mentions",
      expect.any(Object),
    );
  });

  it("logs and returns unsupported when /users/me has no current user id", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTagsAndLinks();
    mockedSafeProviderJson.mockResolvedValueOnce(
      providerResponse({ email: "agent@example.com" }),
    );

    const result = await readZammadSecondaryTicketData(
      providerContext(),
      rawTicket,
    );

    expect(result.subscription).toEqual({ supported: false, following: false });
    expect(warn).toHaveBeenCalledWith(
      "Zammad subscription secondary read unavailable",
      expect.objectContaining({
        endpoint: "users-me",
        issue: "missing-current-user-id",
      }),
    );
    expect(JSON.stringify(warn.mock.calls)).not.toContain("agent@example.com");
  });

  it("logs and returns unsupported when /users/me has an invalid id shape", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTagsAndLinks();
    mockedSafeProviderJson.mockResolvedValueOnce(providerResponse({ id: "4" }));

    const result = await readZammadSecondaryTicketData(
      providerContext(),
      rawTicket,
    );

    expect(result.subscription).toEqual({ supported: false, following: false });
    expect(warn).toHaveBeenCalledWith(
      "Zammad subscription secondary read unavailable",
      expect.objectContaining({
        endpoint: "users-me",
        issue: "unexpected-users-me-shape",
      }),
    );
  });

  it("logs and returns unsupported when /mentions fails", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTagsAndLinks();
    mockedSafeProviderJson
      .mockResolvedValueOnce(providerResponse({ id: 4 }))
      .mockResolvedValueOnce(providerResponse({}, 503));

    const result = await readZammadSecondaryTicketData(
      providerContext(),
      rawTicket,
    );

    expect(result.subscription).toEqual({ supported: false, following: false });
    expect(warn).toHaveBeenCalledWith(
      "Zammad subscription secondary read unavailable",
      expect.objectContaining({
        endpoint: "mentions",
        issue: "request-failed",
        retryable: true,
        statusClass: "5xx",
        statusCode: 503,
        upstreamProviderErrorKind: "temporary-provider-failure",
      }),
    );
  });

  it("logs and returns unsupported when /mentions has an unexpected shape", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTagsAndLinks();
    mockedSafeProviderJson
      .mockResolvedValueOnce(providerResponse({ id: 4 }))
      .mockResolvedValueOnce(providerResponse({ records: [] }));

    const result = await readZammadSecondaryTicketData(
      providerContext(),
      rawTicket,
    );

    expect(result.subscription).toEqual({ supported: false, following: false });
    expect(warn).toHaveBeenCalledWith(
      "Zammad subscription secondary read unavailable",
      expect.objectContaining({
        endpoint: "mentions",
        issue: "unexpected-mentions-shape",
      }),
    );
  });

  it("returns supported false-following when current user has no ticket mention", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mockTagsAndLinks();
    mockedSafeProviderJson
      .mockResolvedValueOnce(providerResponse({ id: 4 }))
      .mockResolvedValueOnce(
        providerResponse({
          mentions: [
            {
              id: 9,
              mentionable_type: "Ticket",
              mentionable_id: 42,
              user_id: 3,
            },
          ],
        }),
      );

    const result = await readZammadSecondaryTicketData(
      providerContext(),
      rawTicket,
    );

    expect(result.subscription).toEqual({
      supported: true,
      following: false,
    });
    expect(warn).not.toHaveBeenCalled();
  });
});

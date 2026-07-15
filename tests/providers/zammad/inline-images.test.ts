import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderBytes, safeProviderJson } from "@/security/provider-http";
import { providerContext, rawArticle } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderBytes: vi.fn(),
  safeProviderJson: vi.fn(),
  ProviderBinaryBodyError: class ProviderBinaryBodyError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.reason = reason;
    }
  },
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.reason = reason;
    }
  },
}));

const mockedBytes = vi.mocked(safeProviderBytes);
const mockedJson = vi.mocked(safeProviderJson);

function inlineArticle(contentType = "image/jpeg") {
  return {
    ...rawArticle,
    body: '<img src="cid:quote@example">',
    attachments: [{
      id: 503,
      filename: "quote.jpeg",
      size: 4,
      preferences: {
        "Content-ID": "<quote@example>",
        "Content-Type": contentType,
      },
    }],
  };
}

describe("Zammad inline ticket images", () => {
  afterEach(() => vi.clearAllMocks());

  it("revalidates and downloads an exact provider-inline raster image", async () => {
    mockedJson.mockResolvedValueOnce({
      data: inlineArticle(), headers: new Headers(), status: 200,
    });
    mockedBytes.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3, 4]), headers: new Headers(), status: 200,
    });

    await expect(zammadProviderPlugin.getTicketInlineImage?.(
      providerContext(),
      { articleExternalId: "500", attachmentExternalId: "503", ticketExternalId: "42" },
    )).resolves.toEqual({
      bytes: new Uint8Array([1, 2, 3, 4]),
      contentType: "image/jpeg",
    });
    expect(mockedBytes).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/ticket_attachment/42/500/503",
      expect.objectContaining({ maxResponseBytes: 5 * 1024 * 1024 }),
    );
  });

  it.each([
    ["a visible attachment", { ...inlineArticle(), body: "<p>No inline image</p>" }],
    ["an unsafe image type", inlineArticle("image/svg+xml")],
    ["an article from another ticket", { ...inlineArticle(), ticket_id: 99 }],
  ])("fails closed for %s without downloading bytes", async (_label, article) => {
    mockedJson.mockResolvedValueOnce({
      data: article, headers: new Headers(), status: 200,
    });

    await expect(zammadProviderPlugin.getTicketInlineImage?.(
      providerContext(),
      { articleExternalId: "500", attachmentExternalId: "503", ticketExternalId: "42" },
    )).rejects.toMatchObject({ kind: "provider-data-mismatch" });
    expect(mockedBytes).not.toHaveBeenCalled();
  });
});

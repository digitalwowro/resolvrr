import { afterEach, describe, expect, it, vi } from "vitest";
import { maxTicketAttachmentDownloadBytes } from "@/core/ticket-attachments";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderBytes, safeProviderJson } from "@/security/provider-http";
import { providerContext, rawArticle } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderBytes: vi.fn(),
  safeProviderJson: vi.fn(),
  ProviderBinaryBodyError: class ProviderBinaryBodyError extends Error {},
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

function article(overrides: Record<string, unknown> = {}) {
  return {
    ...rawArticle,
    attachments: [{
      id: 503,
      filename: "report.pdf",
      size: 4,
      preferences: { "Content-Type": "application/pdf" },
    }],
    ...overrides,
  };
}

describe("Zammad visible ticket attachments", () => {
  afterEach(() => vi.clearAllMocks());

  it("revalidates and downloads the exact visible attachment", async () => {
    mockedJson.mockResolvedValueOnce({
      data: article(), headers: new Headers(), status: 200,
    });
    mockedBytes.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3, 4]), headers: new Headers(), status: 200,
    });

    await expect(zammadProviderPlugin.getTicketAttachment?.(
      providerContext(),
      { articleExternalId: "500", attachmentExternalId: "503", ticketExternalId: "42" },
    )).resolves.toEqual({
      bytes: new Uint8Array([1, 2, 3, 4]),
      contentType: "application/pdf",
      fileName: "report.pdf",
    });
    expect(mockedBytes).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/ticket_attachment/42/500/503",
      expect.objectContaining({ maxResponseBytes: maxTicketAttachmentDownloadBytes }),
    );
  });

  it.each([
    [
      "an inline body resource",
      article({ body: '<img src="/api/v1/ticket_attachment/42/500/503?view=inline">' }),
    ],
    [
      "a message alternative",
      article({
        attachments: [{
          id: 503,
          filename: "message.html",
          size: 4,
          preferences: { "content-alternative": true },
        }],
      }),
    ],
    ["an article from another ticket", article({ ticket_id: 99 })],
    ["a stale byte size", article({ attachments: [{
      id: 503, filename: "report.pdf", size: 5, preferences: {},
    }] })],
  ])("fails closed for %s", async (_label, raw) => {
    mockedJson.mockResolvedValueOnce({
      data: raw, headers: new Headers(), status: 200,
    });
    mockedBytes.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3, 4]), headers: new Headers(), status: 200,
    });

    await expect(zammadProviderPlugin.getTicketAttachment?.(
      providerContext(),
      { articleExternalId: "500", attachmentExternalId: "503", ticketExternalId: "42" },
    )).rejects.toMatchObject({ kind: "provider-data-mismatch" });
    if (_label !== "a stale byte size") {
      expect(mockedBytes).not.toHaveBeenCalled();
    }
  });
});

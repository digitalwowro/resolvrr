import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadGetBytes } from "@/providers/zammad/client";
import { loadZammadReplyHistoryInlineImages } from
  "@/providers/zammad/reply-conversation-history-images";
import type { ZammadArticle } from "@/providers/zammad/schemas";
import { providerContext } from "./read-helpers";

vi.mock("@/providers/zammad/client", () => ({
  zammadGetBytes: vi.fn(),
}));

const mockedGetBytes = vi.mocked(zammadGetBytes);

function articleWithImages(count: number): ZammadArticle {
  return {
    attachments: Array.from({ length: count }, (_, index) => ({
      filename: `signature-${index}.png`,
      id: 1_000 + index,
      preferences: {
        "Content-ID": `<signature-${index}>`,
        "Content-Type": "image/png",
      },
      size: 1,
    })),
    body: Array.from(
      { length: count },
      (_, index) => `<img src="cid:signature-${index}">`,
    ).join(""),
    created_at: "2026-07-21T08:00:00Z",
    from: "Agent <agent@example.com>",
    id: 500,
    internal: false,
    sender: "Agent",
    ticket_id: 42,
    to: "customer@example.com",
    type: "email",
  };
}

describe("Zammad reply-history inline images", () => {
  afterEach(() => vi.clearAllMocks());

  it("accepts many small signature images when their total payload is bounded", async () => {
    mockedGetBytes.mockResolvedValue(new Uint8Array([1]));

    const images = await loadZammadReplyHistoryInlineImages({
      articles: [articleWithImages(35)],
      context: providerContext(),
      ticketId: 42,
    });

    expect(images.size).toBe(35);
    expect(mockedGetBytes).toHaveBeenCalledTimes(35);
  });

  it("still bounds excessive provider image requests", async () => {
    await expect(loadZammadReplyHistoryInlineImages({
      articles: [articleWithImages(101)],
      context: providerContext(),
      ticketId: 42,
    })).rejects.toMatchObject({ diagnosticCode: "reply-history-too-large" });
    expect(mockedGetBytes).not.toHaveBeenCalled();
  });
});

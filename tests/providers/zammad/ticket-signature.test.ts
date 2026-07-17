import { afterEach, describe, expect, it, vi } from "vitest";
import { zammadProviderPlugin } from "@/providers/zammad";
import { safeProviderBytes, safeProviderJson } from "@/security/provider-http";
import { providerContext } from "./read-helpers";

vi.mock("@/security/provider-http", () => ({
  safeProviderBytes: vi.fn(),
  safeProviderJson: vi.fn(),
  ProviderJsonBodyError: class ProviderJsonBodyError extends Error {
    reason: string;
    constructor(reason: string, message: string) {
      super(message);
      this.reason = reason;
    }
  },
}));

const mockedJson = vi.mocked(safeProviderJson);
const mockedBytes = vi.mocked(safeProviderBytes);

describe("Zammad ticket signature resolution", () => {
  afterEach(() => vi.clearAllMocks());

  it("uses the ticket global ID and inlines provider-owned images", async () => {
    mockedJson.mockResolvedValueOnce({
      data: { data: { formUpdater: { fields: { body: { signature: {
        internalId: 9,
        renderedBody: '<p>Agent</p><img src="/api/v1/attachments/77">',
      } } }, flags: {} } } },
      headers: new Headers(),
      status: 200,
    });
    mockedBytes.mockResolvedValueOnce({
      data: new Uint8Array([1, 2, 3]),
      headers: new Headers({ "content-type": "image/png" }),
      status: 200,
    });

    const result = await zammadProviderPlugin.resolveTicketSignature?.(
      providerContext(),
      { groupExternalId: "7", ticketExternalId: "42" },
    );

    const graphRequest = JSON.parse(String(mockedJson.mock.calls[0]?.[1]?.body));
    expect(graphRequest.variables).toMatchObject({
      data: { article: { articleType: "email" }, group_id: 7 },
      id: "gid://zammad/Ticket/42",
    });
    expect(mockedBytes).toHaveBeenCalledWith(
      "https://helpdesk.example.com/api/v1/attachments/77",
      expect.objectContaining({ maxResponseBytes: 512 * 1024 }),
    );
    expect(mockedJson).toHaveBeenCalledWith(
      "https://helpdesk.example.com/graphql",
      expect.objectContaining({ method: "POST" }),
    );
    expect(result?.renderedHtml).toContain("data:image/png;base64,AQID");
  });

  it("returns a versioned empty result when Zammad has no signature", async () => {
    mockedJson.mockResolvedValueOnce({
      data: { data: { formUpdater: { fields: { body: { signature: null } } } } },
      headers: new Headers(),
      status: 200,
    });
    const result = await zammadProviderPlugin.resolveTicketSignature?.(
      providerContext(),
      { groupExternalId: "7", ticketExternalId: "42" },
    );
    expect(result).not.toHaveProperty("renderedHtml");
    expect(result?.contextVersion).toBeTruthy();
    expect(mockedJson).toHaveBeenCalledTimes(1);
    expect(mockedBytes).not.toHaveBeenCalled();
  });

  it("falls back to Zammad 6.5's ticket signature query", async () => {
    const embeddedImage = "data:image/jpeg;base64,AQID";
    mockedJson
      .mockResolvedValueOnce({
        data: { data: { formUpdater: { fields: { group_id: { value: 7 } } } } },
        headers: new Headers(),
        status: 200,
      })
      .mockResolvedValueOnce({
        data: { data: { ticketSignature: {
          id: "gid://zammad/Signature/9",
          renderedBody: `<p>Legacy agent signature</p><img src="${embeddedImage}">`,
        } } },
        headers: new Headers(),
        status: 200,
      });

    const result = await zammadProviderPlugin.resolveTicketSignature?.(
      providerContext(),
      { groupExternalId: "7", ticketExternalId: "42" },
    );

    expect(mockedJson).toHaveBeenCalledTimes(2);
    const legacyRequest = JSON.parse(String(mockedJson.mock.calls[1]?.[1]?.body));
    expect(legacyRequest.variables).toEqual({
      groupId: "gid://zammad/Group/7",
      ticketId: "gid://zammad/Ticket/42",
    });
    expect(result?.renderedHtml).toContain(`<img src="${embeddedImage}"`);
    expect(mockedBytes).not.toHaveBeenCalled();
  });

  it("removes invalid embedded signature images", async () => {
    mockedJson.mockResolvedValueOnce({
      data: { data: { formUpdater: { fields: { body: { signature: {
        internalId: 9,
        renderedBody: '<p>Agent</p><img src="data:image/svg+xml;base64,AQID">',
      } } } } } },
      headers: new Headers(),
      status: 200,
    });

    const result = await zammadProviderPlugin.resolveTicketSignature?.(
      providerContext(),
      { groupExternalId: "7", ticketExternalId: "42" },
    );

    expect(result?.renderedHtml).not.toContain("<img");
    expect(result?.renderedHtml).not.toContain("src=");
    expect(mockedBytes).not.toHaveBeenCalled();
  });
});

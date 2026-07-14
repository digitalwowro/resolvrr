import * as dns from "node:dns/promises";
import * as https from "node:https";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeProviderBytes } from "@/security/provider-http";

const requestMock = vi.hoisted(() => vi.fn());
vi.mock("node:dns/promises", () => ({ lookup: vi.fn() }));
vi.mock("node:https", () => ({ default: { request: requestMock }, request: requestMock }));
const mockedLookup = vi.mocked(dns.lookup);
const mockedRequest = vi.mocked(https.request);

function mockBinary(body: Uint8Array, contentLength = body.byteLength) {
  mockedRequest.mockImplementation(((options: unknown, callback: unknown) => {
    const requestOptions = options as { lookup?: (...args: unknown[]) => void };
    const request = new EventEmitter() as EventEmitter & { end(): void };
    request.end = () => {
      requestOptions.lookup?.("helpdesk.example.com", { all: true }, () => undefined);
      const response = new PassThrough() as PassThrough & {
        statusCode: number; statusMessage: string; headers: Record<string, string>;
      };
      response.statusCode = 200;
      response.statusMessage = "OK";
      response.headers = { "content-length": String(contentLength) };
      (callback as (response: PassThrough) => void)(response);
      response.end(body);
    };
    return request;
  }) as never);
}

describe("safe provider binary reads", () => {
  afterEach(() => vi.clearAllMocks());

  it("reads bytes through a pinned HTTPS request", async () => {
    mockedLookup.mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ] as never);
    mockBinary(new Uint8Array([1, 2, 3]));
    const result = await safeProviderBytes(
      "https://helpdesk.example.com/api/attachment/1",
      { allowedAddresses: ["93.184.216.34"], maxResponseBytes: 3 },
    );
    expect([...result.data]).toEqual([1, 2, 3]);
    expect(mockedRequest).toHaveBeenCalledWith(
      expect.objectContaining({ agent: false, path: "/api/attachment/1" }),
      expect.any(Function),
    );
  });

  it("rejects declared oversized responses before buffering", async () => {
    mockedLookup.mockResolvedValueOnce([
      { address: "93.184.216.34", family: 4 },
    ] as never);
    mockBinary(new Uint8Array(), 10);
    await expect(safeProviderBytes(
      "https://helpdesk.example.com/api/attachment/1",
      { allowedAddresses: ["93.184.216.34"], maxResponseBytes: 3 },
    )).rejects.toThrow("size limit");
  });
});

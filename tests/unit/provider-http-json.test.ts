import * as dns from "node:dns/promises";
import * as https from "node:https";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { safeProviderJson } from "@/security/provider-http";
import type { ProviderJsonBodyError } from "@/security/provider-http";

const requestMock = vi.hoisted(() => vi.fn());

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

vi.mock("node:https", () => ({
  default: { request: requestMock },
  request: requestMock,
}));

const mockedLookup = vi.mocked(dns.lookup);
const mockedRequest = vi.mocked(https.request);

function dnsResult(address: string, family: 4 | 6) {
  return [{ address, family }] as unknown as Awaited<
    ReturnType<typeof dns.lookup>
  >;
}

function mockJsonRequest(input: { status?: number; body: string }) {
  mockedRequest.mockImplementation(((options: unknown, callback: unknown) => {
    const requestOptions = options as {
      lookup?: (
        hostname: string,
        options: object,
        callback: (error: unknown, address: string | unknown[]) => void,
      ) => void;
    };
    const responseCallback = callback as (response: PassThrough) => void;
    const request = new EventEmitter() as EventEmitter & {
      end: () => void;
    };
    request.end = () => {
      requestOptions.lookup?.(
        "helpdesk.example.com",
        { all: true },
        () => undefined,
      );

      const response = new PassThrough() as PassThrough & {
        statusCode: number;
        statusMessage: string;
        headers: Record<string, string>;
      };
      response.statusCode = input.status ?? 200;
      response.statusMessage = "OK";
      response.headers = { "content-type": "application/json" };
      responseCallback(response);
      response.end(input.body);
    };
    return request;
  }) as never);
}

describe("safe provider JSON reads", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reads provider JSON through the pinned address helper", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));
    mockJsonRequest({ body: "{\"tickets\":[1]}" });

    const response = await safeProviderJson(
      "https://helpdesk.example.com/api/v1/tickets",
      {
        allowedAddresses: ["93.184.216.34"],
        maxResponseBytes: 64,
      },
    );

    expect(response.status).toBe(200);
    expect(response.data).toEqual({ tickets: [1] });
    expect(mockedRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        agent: false,
        path: "/api/v1/tickets",
      }),
      expect.any(Function),
    );
  });

  it("does not parse non-success provider JSON response bodies", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));
    mockJsonRequest({ status: 401, body: "{\"secret\":\"body\"}" });

    const response = await safeProviderJson(
      "https://helpdesk.example.com/api/v1/tickets",
      {
        allowedAddresses: ["93.184.216.34"],
        maxResponseBytes: 64,
      },
    );

    expect(response.status).toBe(401);
    expect(response).not.toHaveProperty("data");
  });

  it("rejects oversized provider JSON response bodies safely", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));
    mockJsonRequest({ body: "{\"long\":\"0123456789\"}" });

    await expect(
      safeProviderJson("https://helpdesk.example.com/api/v1/tickets", {
        allowedAddresses: ["93.184.216.34"],
        maxResponseBytes: 8,
      }),
    ).rejects.toMatchObject({
      name: "ProviderJsonBodyError",
      reason: "size-limit",
    } satisfies Partial<ProviderJsonBodyError>);
  });

  it("rejects invalid provider JSON response bodies safely", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));
    mockJsonRequest({ body: "{not json" });

    await expect(
      safeProviderJson("https://helpdesk.example.com/api/v1/tickets", {
        allowedAddresses: ["93.184.216.34"],
        maxResponseBytes: 64,
      }),
    ).rejects.toMatchObject({
      name: "ProviderJsonBodyError",
      reason: "invalid-json",
    } satisfies Partial<ProviderJsonBodyError>);
  });
});

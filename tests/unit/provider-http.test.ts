import * as dns from "node:dns/promises";
import * as https from "node:https";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import { afterEach, describe, expect, it, vi } from "vitest";
import { validateProviderBaseUrl } from "@/security/base-url-validation";
import { safeProviderFetch } from "@/security/provider-http";

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

function dnsResults(entries: Array<[string, 4 | 6]>) {
  return entries.map(([address, family]) => ({
    address,
    family,
  })) as unknown as Awaited<ReturnType<typeof dns.lookup>>;
}

function mockSuccessfulRequest() {
  let pinnedAddress: string | undefined;
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
      if (
        "lookup" in requestOptions &&
        typeof requestOptions.lookup === "function"
      ) {
        requestOptions.lookup(
          "helpdesk.example.com",
          { all: true },
          (_error, address) => {
            const addresses = address as Array<{ address: string }>;
            pinnedAddress = Array.isArray(address)
              ? addresses[0]?.address
              : undefined;
          },
        );
      }

      const response = new PassThrough() as PassThrough & {
        statusCode: number;
        statusMessage: string;
        headers: Record<string, string>;
      };
      response.statusCode = 200;
      response.statusMessage = "OK";
      response.headers = { "content-type": "application/json" };
      responseCallback(response);
      response.end("{}");
    };
    return request;
  }) as never);

  return () => pinnedAddress;
}

function mockFailThenSuccessfulRequest() {
  const pinnedAddresses: string[] = [];
  let requestCount = 0;

  mockedRequest.mockImplementation(((options: unknown, callback: unknown) => {
    requestCount += 1;
    const currentRequest = requestCount;
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
      if (
        "lookup" in requestOptions &&
        typeof requestOptions.lookup === "function"
      ) {
        requestOptions.lookup(
          "helpdesk.example.com",
          { all: true },
          (_error, address) => {
            const addresses = address as Array<{ address: string }>;
            if (Array.isArray(address) && address[0]) {
              pinnedAddresses.push(addresses[0].address);
            }
          },
        );
      }

      if (currentRequest === 1) {
        request.emit("error", new Error("network unreachable"));
        return;
      }

      const response = new PassThrough() as PassThrough & {
        statusCode: number;
        statusMessage: string;
        headers: Record<string, string>;
      };
      response.statusCode = 200;
      response.statusMessage = "OK";
      response.headers = { "content-type": "application/json" };
      responseCallback(response);
      response.end("{}");
    };
    return request;
  }) as never);

  return pinnedAddresses;
}

describe("safe provider fetch", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("rejects DNS rebinding from a validated public address to a private address", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));
    const validated = await validateProviderBaseUrl("https://helpdesk.example.com");

    mockedLookup.mockResolvedValueOnce(dnsResult("10.0.0.10", 4));

    await expect(
      safeProviderFetch(`${validated.canonicalUrl}/api/v1/users/me`, {
        allowedAddresses: validated.addresses,
      }),
    ).rejects.toThrow("blocked");
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it("rejects DNS rebinding to a different unvalidated public address", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));

    await expect(
      safeProviderFetch("https://helpdesk.example.com/api/v1/users/me", {
        allowedAddresses: ["93.184.216.35"],
      }),
    ).rejects.toThrow("validated address set");
    expect(mockedRequest).not.toHaveBeenCalled();
  });

  it("pins the request lookup to the validated address", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));
    const pinnedAddress = mockSuccessfulRequest();

    const response = await safeProviderFetch(
      "https://helpdesk.example.com/api/v1/users/me",
      {
        allowedAddresses: ["93.184.216.34"],
        headers: { Accept: "application/json" },
      },
    );

    expect(response.status).toBe(200);
    expect(pinnedAddress()).toBe("93.184.216.34");
    expect(mockedRequest).toHaveBeenCalledWith(
      expect.objectContaining({ agent: false }),
      expect.any(Function),
    );
    expect(mockedRequest).toHaveBeenCalledOnce();
  });

  it("prefers validated IPv4 addresses when both address families are available", async () => {
    mockedLookup.mockResolvedValueOnce(
      dnsResults([
        ["2001:4860:4860::8888", 6],
        ["93.184.216.34", 4],
      ]),
    );
    const pinnedAddress = mockSuccessfulRequest();

    const response = await safeProviderFetch(
      "https://helpdesk.example.com/api/v1/users/me",
      {
        allowedAddresses: ["2001:4860:4860::8888", "93.184.216.34"],
      },
    );

    expect(response.status).toBe(200);
    expect(pinnedAddress()).toBe("93.184.216.34");
  });

  it("falls back to another validated public address after a network error", async () => {
    mockedLookup.mockResolvedValueOnce(
      dnsResults([
        ["93.184.216.34", 4],
        ["93.184.216.35", 4],
      ]),
    );
    const pinnedAddresses = mockFailThenSuccessfulRequest();

    const response = await safeProviderFetch(
      "https://helpdesk.example.com/api/v1/users/me",
      {
        allowedAddresses: ["93.184.216.34", "93.184.216.35"],
      },
    );

    expect(response.status).toBe(200);
    expect(pinnedAddresses).toEqual(["93.184.216.34", "93.184.216.35"]);
    expect(mockedRequest).toHaveBeenCalledTimes(2);
  });

  it("discards validation response bodies", async () => {
    mockedLookup.mockResolvedValueOnce(dnsResult("93.184.216.34", 4));
    mockSuccessfulRequest();

    const response = await safeProviderFetch(
      "https://helpdesk.example.com/api/v1/users/me",
      {
        allowedAddresses: ["93.184.216.34"],
      },
    );

    await expect(response.text()).resolves.toBe("");
  });
});

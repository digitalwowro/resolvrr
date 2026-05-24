import * as dns from "node:dns/promises";
import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import type { IncomingHttpHeaders } from "node:http";
import { isBlockedProviderAddress } from "./base-url-validation";

type SafeProviderFetchOptions = {
  allowedAddresses: string[];
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

function requestHost(url: URL): string {
  return url.hostname.replace(/^\[|\]$/gu, "");
}

function comparableAddress(address: string): string {
  return address.toLowerCase();
}

async function resolveRequestAddresses(host: string): Promise<string[]> {
  if (isIP(host) !== 0) {
    return [host];
  }

  return (await dns.lookup(host, { all: true, verbatim: true })).map(
    (entry) => entry.address,
  );
}

function choosePinnedAddress(
  resolvedAddresses: string[],
  allowedAddresses: string[],
): string {
  if (resolvedAddresses.length === 0 || allowedAddresses.length === 0) {
    throw new Error("Provider URL host could not be safely resolved.");
  }

  if (resolvedAddresses.some(isBlockedProviderAddress)) {
    throw new Error("Provider URL resolved to a blocked network address.");
  }

  const allowed = new Set(allowedAddresses.map(comparableAddress));
  const selected = resolvedAddresses.find((address) =>
    allowed.has(comparableAddress(address)),
  );
  if (!selected) {
    throw new Error("Provider URL resolved outside the validated address set.");
  }

  return selected;
}

function pinnedLookup(address: string): LookupFunction {
  return (_hostname, _options, callback) => {
    callback(null, address, isIP(address));
  };
}

function headersFromIncoming(headers: IncomingHttpHeaders): Headers {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => result.append(name, item));
      continue;
    }
    if (value !== undefined) {
      result.append(name, String(value));
    }
  }
  return result;
}

// Provider requests must use the already validated address set so DNS rebinding
// cannot swap a public validation result for an internal request target.
export async function safeProviderFetch(
  input: string,
  options: SafeProviderFetchOptions,
): Promise<Response> {
  const url = new URL(input);
  if (url.protocol !== "https:") {
    throw new Error("Provider requests must use HTTPS.");
  }

  const host = requestHost(url);
  const resolvedAddresses = await resolveRequestAddresses(host);
  const address = choosePinnedAddress(resolvedAddresses, options.allowedAddresses);

  return new Promise((resolve, reject) => {
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname: host,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: "GET",
        headers: options.headers,
        lookup: pinnedLookup(address),
        agent: false,
        servername: isIP(host) === 0 ? host : undefined,
        signal: options.signal,
      },
      (response) => {
        response.resume();
        response.on("end", () => {
          resolve(
            new Response(null, {
              status: response.statusCode ?? 0,
              statusText: response.statusMessage,
              headers: headersFromIncoming(response.headers),
            }),
          );
        });
        response.on("error", reject);
      },
    );

    request.on("error", reject);
    request.end();
  });
}

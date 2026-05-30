import { request as httpsRequest } from "node:https";
import type { IncomingHttpHeaders } from "node:http";
import { isIP, type LookupFunction } from "node:net";

export type SafeProviderFetchOptions = {
  allowedAddresses: string[];
  body?: string | Uint8Array;
  headers?: Record<string, string>;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  signal?: AbortSignal;
};

export type SafeProviderJsonOptions = SafeProviderFetchOptions & {
  maxResponseBytes: number;
};

export type SafeProviderJsonResult = {
  status: number;
  statusText?: string;
  headers: Headers;
  data?: unknown;
};

export type ProviderJsonBodyErrorReason = "invalid-json" | "size-limit";

export class ProviderJsonBodyError extends Error {
  readonly reason: ProviderJsonBodyErrorReason;

  constructor(reason: ProviderJsonBodyErrorReason, message: string) {
    super(message);
    this.name = "ProviderJsonBodyError";
    this.reason = reason;
  }
}

function pinnedLookup(address: string): LookupFunction {
  return (_hostname, options, callback) => {
    const family = isIP(address);
    if (typeof options === "object" && options !== null && "all" in options && options.all) {
      callback(null, [{ address, family }] as never, family);
      return;
    }

    callback(null, address, family);
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

function requestBodyBuffer(
  body: SafeProviderFetchOptions["body"],
): Buffer | undefined {
  if (body === undefined) {
    return undefined;
  }
  return typeof body === "string" ? Buffer.from(body) : Buffer.from(body);
}

function requestHeaders(
  options: SafeProviderFetchOptions,
  body: Buffer | undefined,
): Record<string, string> | undefined {
  if (!body) {
    return options.headers;
  }

  return {
    ...options.headers,
    "Content-Length": String(body.byteLength),
  };
}

export function requestPinnedAddress(
  url: URL,
  host: string,
  address: string,
  options: SafeProviderFetchOptions,
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const body = requestBodyBuffer(options.body);
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname: host,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: options.method ?? "GET",
        headers: requestHeaders(options, body),
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
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

export function requestPinnedJsonAddress(
  url: URL,
  host: string,
  address: string,
  options: SafeProviderJsonOptions,
): Promise<SafeProviderJsonResult> {
  return new Promise((resolve, reject) => {
    const body = requestBodyBuffer(options.body);
    const request = httpsRequest(
      {
        protocol: "https:",
        hostname: host,
        port: url.port || 443,
        path: `${url.pathname}${url.search}`,
        method: options.method ?? "GET",
        headers: requestHeaders(options, body),
        lookup: pinnedLookup(address),
        agent: false,
        servername: isIP(host) === 0 ? host : undefined,
        signal: options.signal,
      },
      (response) => {
        const status = response.statusCode ?? 0;
        const headers = headersFromIncoming(response.headers);
        if (status < 200 || status >= 300) {
          response.resume();
          response.on("end", () => {
            resolve({ status, statusText: response.statusMessage, headers });
          });
          response.on("error", reject);
          return;
        }

        const chunks: Buffer[] = [];
        let receivedBytes = 0;
        response.on("data", (chunk: Buffer | string) => {
          const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
          receivedBytes += buffer.byteLength;
          if (receivedBytes > options.maxResponseBytes) {
            response.destroy(
              new ProviderJsonBodyError(
                "size-limit",
                "Provider response exceeded the configured size limit.",
              ),
            );
            return;
          }
          chunks.push(buffer);
        });
        response.on("end", () => {
          try {
            const body = Buffer.concat(chunks).toString("utf8");
            resolve({
              status,
              statusText: response.statusMessage,
              headers,
              data: body.length > 0 ? JSON.parse(body) : undefined,
            });
          } catch {
            reject(
              new ProviderJsonBodyError(
                "invalid-json",
                "Provider returned invalid JSON.",
              ),
            );
          }
        });
        response.on("error", reject);
      },
    );

    request.on("error", reject);
    if (body) {
      request.write(body);
    }
    request.end();
  });
}

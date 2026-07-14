import { request as httpsRequest } from "node:https";
import { isIP, type LookupFunction } from "node:net";
import type { SafeProviderFetchOptions } from "./provider-http-request";

export type SafeProviderBytesResult = {
  data: Uint8Array;
  headers: Headers;
  status: number;
  statusText?: string;
};

export class ProviderBinaryBodyError extends Error {
  constructor() {
    super("Provider response exceeded the configured size limit.");
    this.name = "ProviderBinaryBodyError";
  }
}

function pinnedLookup(address: string): LookupFunction {
  return (_hostname, options, callback) => {
    const family = isIP(address);
    if (typeof options === "object" && options !== null && options.all) {
      callback(null, [{ address, family }] as never, family);
      return;
    }
    callback(null, address, family);
  };
}

function responseHeaders(headers: Record<string, string | string[] | undefined>) {
  const result = new Headers();
  for (const [name, value] of Object.entries(headers)) {
    if (Array.isArray(value)) value.forEach((item) => result.append(name, item));
    else if (value !== undefined) result.append(name, String(value));
  }
  return result;
}

export function requestPinnedBytesAddress(
  url: URL,
  host: string,
  address: string,
  options: SafeProviderFetchOptions & { maxResponseBytes: number },
): Promise<SafeProviderBytesResult> {
  return new Promise((resolve, reject) => {
    const request = httpsRequest({
      protocol: "https:", hostname: host, port: url.port || 443,
      path: `${url.pathname}${url.search}`, method: "GET",
      headers: options.headers, lookup: pinnedLookup(address), agent: false,
      servername: isIP(host) === 0 ? host : undefined, signal: options.signal,
    }, (response) => {
      const status = response.statusCode ?? 0;
      const headers = responseHeaders(response.headers);
      response.on("error", reject);
      if (status < 200 || status >= 300) {
        response.resume();
        response.on("end", () => resolve({ data: new Uint8Array(), headers, status }));
        response.on("error", reject);
        return;
      }
      const declared = Number(headers.get("content-length"));
      if (Number.isFinite(declared) && declared > options.maxResponseBytes) {
        response.resume();
        reject(new ProviderBinaryBodyError());
        return;
      }
      const chunks: Buffer[] = [];
      let received = 0;
      response.on("data", (chunk: Buffer | string) => {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        received += buffer.byteLength;
        if (received > options.maxResponseBytes) {
          response.destroy(new ProviderBinaryBodyError());
          return;
        }
        chunks.push(buffer);
      });
      response.on("end", () => resolve({
        data: Buffer.concat(chunks), headers, status,
        statusText: response.statusMessage,
      }));
    });
    request.on("error", reject);
    request.end();
  });
}

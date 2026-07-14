import * as dns from "node:dns/promises";
import { isIP } from "node:net";
import { isBlockedProviderAddress } from "./base-url-validation";
import {
  ProviderJsonBodyError,
  requestPinnedAddress,
  requestPinnedJsonAddress,
  type SafeProviderFetchOptions,
  type SafeProviderJsonOptions,
  type SafeProviderJsonResult,
} from "./provider-http-request";
import {
  ProviderBinaryBodyError,
  requestPinnedBytesAddress,
  type SafeProviderBytesResult,
} from "./provider-http-binary-request";
export { ProviderBinaryBodyError } from "./provider-http-binary-request";
export {
  ProviderJsonBodyError,
  type ProviderJsonBodyErrorReason,
  type SafeProviderJsonResult,
} from "./provider-http-request";

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

function orderedPinnedAddresses(
  resolvedAddresses: string[],
  allowedAddresses: string[],
): string[] {
  if (resolvedAddresses.length === 0 || allowedAddresses.length === 0) {
    throw new Error("Provider URL host could not be safely resolved.");
  }

  if (resolvedAddresses.some(isBlockedProviderAddress)) {
    throw new Error("Provider URL resolved to a blocked network address.");
  }

  const allowed = new Set(allowedAddresses.map(comparableAddress));
  const selected = resolvedAddresses.filter((address) =>
    allowed.has(comparableAddress(address)),
  );
  if (selected.length === 0) {
    throw new Error("Provider URL resolved outside the validated address set.");
  }

  return selected.sort((left, right) => {
    const leftVersion = isIP(left);
    const rightVersion = isIP(right);
    if (leftVersion === rightVersion) {
      return 0;
    }
    return leftVersion === 4 ? -1 : 1;
  });
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
  const addresses = orderedPinnedAddresses(
    resolvedAddresses,
    options.allowedAddresses,
  );
  let lastError: unknown;

  for (const address of addresses) {
    try {
      return await requestPinnedAddress(url, host, address, options);
    } catch (error) {
      lastError = error;
      if (options.signal?.aborted) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Provider URL could not be reached.");
}

export async function safeProviderJson(
  input: string,
  options: SafeProviderJsonOptions,
): Promise<SafeProviderJsonResult> {
  const url = new URL(input);
  if (url.protocol !== "https:") {
    throw new Error("Provider requests must use HTTPS.");
  }

  const host = requestHost(url);
  const resolvedAddresses = await resolveRequestAddresses(host);
  const addresses = orderedPinnedAddresses(
    resolvedAddresses,
    options.allowedAddresses,
  );
  let lastError: unknown;

  for (const address of addresses) {
    try {
      return await requestPinnedJsonAddress(url, host, address, options);
    } catch (error) {
      lastError = error;
      if (options.signal?.aborted || error instanceof ProviderJsonBodyError) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("Provider URL could not be reached.");
}

export async function safeProviderBytes(
  input: string,
  options: SafeProviderFetchOptions & { maxResponseBytes: number },
): Promise<SafeProviderBytesResult> {
  const url = new URL(input);
  if (url.protocol !== "https:") throw new Error("Provider requests must use HTTPS.");
  const host = requestHost(url);
  const addresses = orderedPinnedAddresses(
    await resolveRequestAddresses(host),
    options.allowedAddresses,
  );
  let lastError: unknown;
  for (const address of addresses) {
    try {
      return await requestPinnedBytesAddress(url, host, address, options);
    } catch (error) {
      lastError = error;
      if (options.signal?.aborted || error instanceof ProviderBinaryBodyError) throw error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Provider URL could not be reached.");
}

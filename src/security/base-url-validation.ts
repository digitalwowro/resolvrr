import * as dns from "node:dns/promises";
import { isIP } from "node:net";

export type ValidatedBaseUrl = {
  canonicalUrl: string;
  addresses: string[];
};

const ipv4Ranges: Array<[string, number]> = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10],
  ["127.0.0.0", 8],
  ["169.254.0.0", 16],
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.0.2.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["198.51.100.0", 24],
  ["203.0.113.0", 24],
  ["224.0.0.0", 4],
  ["240.0.0.0", 4],
  ["255.255.255.255", 32],
];

const ipv6Ranges: Array<[string, number]> = [
  ["::", 128],
  ["::1", 128],
  ["::ffff:0:0", 96],
  ["64:ff9b::", 96],
  ["100::", 64],
  ["2001:db8::", 32],
  ["fc00::", 7],
  ["fe80::", 10],
  ["ff00::", 8],
];

function parseIpv4(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) {
    return null;
  }

  let result = 0;
  for (const part of parts) {
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return null;
    }
    result = (result << 8) + value;
  }

  return result >>> 0;
}

function ipv4InRange(address: string, base: string, prefixLength: number): boolean {
  const parsedAddress = parseIpv4(address);
  const parsedBase = parseIpv4(base);
  if (parsedAddress === null || parsedBase === null) {
    return false;
  }

  const mask =
    prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
  return (parsedAddress & mask) === (parsedBase & mask);
}

function expandIpv6(address: string): bigint | null {
  const normalized = address.toLowerCase();
  if (normalized.includes(".")) {
    return null;
  }

  const parts = normalized.split("::");
  if (parts.length > 2) {
    return null;
  }

  const left = parts[0] ? parts[0].split(":") : [];
  const right = parts[1] ? parts[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (parts.length === 1 && missing !== 0)) {
    return null;
  }

  const groups = [
    ...left,
    ...Array.from({ length: missing }, () => "0"),
    ...right,
  ];

  if (groups.length !== 8) {
    return null;
  }

  let result = 0n;
  for (const group of groups) {
    if (!/^[0-9a-f]{1,4}$/u.test(group)) {
      return null;
    }
    result = (result << 16n) + BigInt(parseInt(group, 16));
  }

  return result;
}

function ipv6InRange(address: string, base: string, prefixLength: number): boolean {
  const parsedAddress = expandIpv6(address);
  const parsedBase = expandIpv6(base);
  if (parsedAddress === null || parsedBase === null) {
    return false;
  }

  const hostBits = 128n - BigInt(prefixLength);
  const mask = ((1n << 128n) - 1n) ^ ((1n << hostBits) - 1n);
  return (parsedAddress & mask) === (parsedBase & mask);
}

export function isBlockedProviderAddress(address: string): boolean {
  const ipVersion = isIP(address);
  if (ipVersion === 4) {
    return ipv4Ranges.some(([base, prefix]) =>
      ipv4InRange(address, base, prefix),
    );
  }

  if (ipVersion === 6) {
    return ipv6Ranges.some(([base, prefix]) =>
      ipv6InRange(address, base, prefix),
    );
  }

  return true;
}

function normalizeBaseUrl(input: string): string {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    throw new Error("Enter a valid HTTPS helpdesk URL.");
  }

  if (parsed.protocol !== "https:") {
    throw new Error("Helpdesk URL must use HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new Error("Helpdesk URL must not include credentials.");
  }

  if (parsed.search || parsed.hash) {
    throw new Error("Helpdesk URL must not include query strings or fragments.");
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/u, "");
  return parsed.toString().replace(/\/+$/u, "");
}

export async function validateProviderBaseUrl(
  input: string,
): Promise<ValidatedBaseUrl> {
  const canonicalUrl = normalizeBaseUrl(input);
  const host = new URL(canonicalUrl).hostname.replace(/^\[|\]$/gu, "");

  if (host === "localhost" || host.endsWith(".localhost")) {
    throw new Error("Helpdesk URL cannot point to localhost.");
  }

  const directIpVersion = isIP(host);
  const addresses =
    directIpVersion === 0
      ? (await dns.lookup(host, { all: true, verbatim: true })).map(
          (entry) => entry.address,
        )
      : [host];

  if (addresses.length === 0) {
    throw new Error("Helpdesk URL host could not be resolved.");
  }

  if (addresses.some(isBlockedProviderAddress)) {
    throw new Error("Helpdesk URL resolves to a blocked network address.");
  }

  return { canonicalUrl, addresses };
}

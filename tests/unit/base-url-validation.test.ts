import * as dns from "node:dns/promises";
import { describe, expect, it, vi } from "vitest";
import {
  isBlockedProviderAddress,
  validateProviderBaseUrl,
} from "@/security/base-url-validation";

vi.mock("node:dns/promises", () => ({
  lookup: vi.fn(),
}));

const mockedLookup = vi.mocked(dns.lookup);

describe("provider base URL validation", () => {
  it("accepts public HTTPS URLs and normalizes trailing slashes", async () => {
    await expect(
      validateProviderBaseUrl("https://93.184.216.34/helpdesk///"),
    ).resolves.toMatchObject({
      canonicalUrl: "https://93.184.216.34/helpdesk",
      addresses: ["93.184.216.34"],
    });
  });

  it("rejects non-HTTPS URLs, URL credentials, query strings, and fragments", async () => {
    await expect(validateProviderBaseUrl("http://example.com")).rejects.toThrow(
      "HTTPS",
    );
    await expect(
      validateProviderBaseUrl("https://user:pass@example.com"),
    ).rejects.toThrow("credentials");
    await expect(
      validateProviderBaseUrl("https://example.com?x=1"),
    ).rejects.toThrow("query");
    await expect(validateProviderBaseUrl("https://example.com#x")).rejects.toThrow(
      "fragments",
    );
  });

  it("rejects localhost and blocked direct IP addresses", async () => {
    await expect(validateProviderBaseUrl("https://localhost")).rejects.toThrow(
      "localhost",
    );
    await expect(validateProviderBaseUrl("https://10.0.0.1")).rejects.toThrow(
      "blocked",
    );
    await expect(
      validateProviderBaseUrl("https://169.254.169.254"),
    ).rejects.toThrow("blocked");
  });

  it("rejects hostnames that resolve to blocked addresses", async () => {
    mockedLookup.mockResolvedValueOnce([
      { address: "192.168.1.20", family: 4 },
    ] as unknown as Awaited<ReturnType<typeof dns.lookup>>);

    await expect(
      validateProviderBaseUrl("https://helpdesk.example.com"),
    ).rejects.toThrow("blocked");
  });

  it("classifies private and reserved address ranges", () => {
    expect(isBlockedProviderAddress("127.0.0.1")).toBe(true);
    expect(isBlockedProviderAddress("172.20.0.10")).toBe(true);
    expect(isBlockedProviderAddress("203.0.113.1")).toBe(true);
    expect(isBlockedProviderAddress("::ffff:7f00:1")).toBe(true);
    expect(isBlockedProviderAddress("64:ff9b::5db8:d822")).toBe(true);
    expect(isBlockedProviderAddress("100::1")).toBe(true);
    expect(isBlockedProviderAddress("fc00::1")).toBe(true);
    expect(isBlockedProviderAddress("fe80::1")).toBe(true);
    expect(isBlockedProviderAddress("2001:db8::1")).toBe(true);
    expect(isBlockedProviderAddress("93.184.216.34")).toBe(false);
  });

  it("rejects IPv4-mapped IPv6 URLs", async () => {
    await expect(
      validateProviderBaseUrl("https://[::ffff:7f00:1]"),
    ).rejects.toThrow("blocked");
  });
});

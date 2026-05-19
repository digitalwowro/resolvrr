import { describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/security/encryption";

const testKey = Buffer.from("0123456789abcdef0123456789abcdef").toString(
  "base64",
);

describe("secret encryption", () => {
  it("round-trips plaintext without storing it directly", () => {
    const encrypted = encryptSecret("sensitive value", testKey);

    expect(encrypted).not.toContain("sensitive value");
    expect(decryptSecret(encrypted, testKey)).toBe("sensitive value");
  });

  it("rejects malformed envelopes", () => {
    expect(() => decryptSecret("not-an-envelope", testKey)).toThrow(
      "Unsupported encrypted secret envelope",
    );
  });
});

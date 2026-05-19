import { describe, expect, it } from "vitest";
import {
  isValidPassword,
  normalizeEmail,
  parseLoginInput,
  parseRegistrationInput,
} from "@/auth/validation";

describe("auth validation", () => {
  it("normalizes email addresses", () => {
    expect(normalizeEmail(" Agent@Example.COM ")).toBe("agent@example.com");
  });

  it("requires registration passwords with at least 12 characters", () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("long-enough-password")).toBe(true);
  });

  it("parses login input with a non-empty password", () => {
    expect(
      parseLoginInput({ email: "USER@example.com", password: "secret" }),
    ).toEqual({ email: "user@example.com", password: "secret" });
  });

  it("rejects registration input with a weak password", () => {
    expect(
      parseRegistrationInput({ email: "user@example.com", password: "short" }),
    ).toBeNull();
  });
});

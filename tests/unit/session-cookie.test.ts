import { describe, expect, it } from "vitest";
import {
  clearedSessionCookieOptions,
  sessionCookieName,
  sessionCookieOptions,
} from "@/auth/session-cookie";

describe("session cookie options", () => {
  it("uses the Resolvrr session cookie name", () => {
    expect(sessionCookieName).toBe("resolvrr_session");
  });

  it("sets an http-only same-site cookie for the session", () => {
    const expires = new Date("2026-06-01T00:00:00.000Z");

    expect(
      sessionCookieOptions(expires, {
        appBaseUrl: "https://resolvrr.dwow.dev",
        nodeEnv: "development",
      }),
    ).toMatchObject({
      httpOnly: true,
      sameSite: "lax",
      secure: true,
      path: "/",
      expires,
    });
  });

  it("clears the cookie with an expired date", () => {
    expect(clearedSessionCookieOptions().expires).toEqual(new Date(0));
  });
});

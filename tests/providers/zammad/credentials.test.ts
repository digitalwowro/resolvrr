import { describe, expect, it } from "vitest";
import {
  buildBasicAuthHeader,
  normalizeZammadBaseUrl,
} from "@/providers/zammad/credentials";

describe("Zammad Basic Auth credentials", () => {
  it("normalizes base URLs without path slashes, search, or hash", () => {
    expect(normalizeZammadBaseUrl("https://helpdesk.example.com///?x=1#y")).toBe(
      "https://helpdesk.example.com",
    );
  });

  it("builds a Basic Auth header", () => {
    expect(
      buildBasicAuthHeader({ username: "agent", password: "secret" }),
    ).toBe("Basic YWdlbnQ6c2VjcmV0");
  });
});
